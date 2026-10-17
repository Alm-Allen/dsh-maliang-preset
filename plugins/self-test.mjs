/**
 * 马良模式自测：拿**当前 Host 真实发布的工具 schema** 验证 maliang-zh 的中文化覆盖率，
 * 同时守住四条会让会话直接不可用或持续退化的纪律。
 *
 * 用法：node self-test.mjs <工具清单 JSON 文件>
 *   工具清单来自 Host `Tool` Inspect provider 的 `listTools`（存成文件即可）；
 *   不给参数时用内置的创造模式样本（原文取自 DSH 源码里真实的 description / section 文本）。
 *
 * 与雅言/仓颉版 self-test 的关系：三份脚本守的是同一批纪律，样本不同——雅言用标准模式的
 * 工具目录，仓颉用 PTC 的提示词快照（段落为主），马良用**创造模式**的到达面：标准模式的
 * 全部工具，加上 `cordis_inspect_list` / `cordis_inspect_query`、workflow 面，以及
 * `skill-filesystem.customSkillDirs` 挂进来的四条开发指引。
 *
 * 守住的纪律：
 *   1. section 数量不变（身份段走按名注入，不该落到"补一段"的兜底分支）；
 *   2. 会被 harness 插值的 section 里不许留下未注册变量（否则整份提示词组装抛错）；
 *   3. 翻译幂等（同一输入两次结果逐字相同，否则每个 step 的前缀都会漂移）；
 *   4. 系统提示词与工作目录无关（换目录后 sections 与 tools 逐字节相同，即缓存契约）。
 *
 * 另外守一条创造模式专属的契约：技能目录里那四条开发指引
 * （`agent-experience`、`cordis-plugin-development`、`editing-cordis-compositions`、
 * `cordis-composition-reference`）的**描述**必须被翻译——它们只出现在创造模式的技能目录里，
 * 另外两个预设挂不到它们，所以没有别的地方会替它们把关。
 *
 * 未汉化条目分三类报告，处置方式不同：
 *   [miss]   表里确实没有这条原文——补表；
 *   [escape] 表里有这条原文，但它含会被源码转义的字符（`\`、`'`），精确匹配因此失效；
 *   [drift]  表里只有前缀相同、长度相近的旧版原文——上游改写了措辞，按新原文补表。
 */
import fs from 'node:fs'

const listFile = process.argv[2]
const mod = await import(new URL('./maliang-zh.mjs', import.meta.url).href)
if (typeof mod.apply !== 'function') throw new Error('maliang-zh.mjs 未导出 apply')

let handler
let stepHandler
mod.apply({
	on: (event, fn) => {
		if (event === 'system-prompt/assemble') handler = fn
		if (event === 'agent/pre-step') stepHandler = fn
	},
})
if (handler === undefined) throw new Error('未注册 system-prompt/assemble 监听')

const IDENTITY_EN = 'You are an AI agent powered by DeepSeek Harness.'
const CJK = /[\u4e00-\u9fff]/

/**
 * 内置样本的 section 文本：身份段之外的每一段都取自 DSH 源码里的真实原文
 * （`@` 引用说明、write 的"先读后写"节）。它们走的是与真实组装同一条路径。
 */
const PROBE_SECTIONS = [
	{
		name: 'harness:workspace-references',
		text: 'Tokens prefixed with @ are workspace paths the user explicitly referenced, relative to the workspace root. A trailing slash marks a directory: list it when its contents matter. Anything else is a file: use the read tool when its contents are needed, and do not claim to have inspected it before reading. @"..." quotes a path containing spaces.',
	},
	{
		name: 'tool:write-after-read',
		text: 'Read an existing file before overwriting it with write (the default fs-observation-policy requires it) and prefer edit for targeted changes.',
	},
]

/** 创造模式特有的两个运行时检查工具（原文取自 `@deepseek-ai/dsh-tool-cordis`）。 */
const CORDIS_TOOLS = [
	{
		name: 'cordis_inspect_list',
		description: 'List every Cordis Inspect Provider currently known to the Host, including local Host Providers and the latest manifests synchronized from the Client. Each entry includes its platform, purpose, read-only methods, and input/output schemas. Call this Tool before writing or configuring a plugin, then select the provider and method for cordis_inspect_query from its result. Do not guess names or treat an Inspect method as a business Service that Plugin code can call.',
		parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
	},
	{
		name: 'cordis_inspect_query',
		description: "Run a read-only query declared by an Inspect Provider. platform, provider, and method must come from cordis_inspect_list, and input must satisfy that method's schema. Use this Tool before writing plugin code to read exact Service methods, Event modes, plugin Config schemas, Tool schemas, theme tokens, or live Slot trees and props. Host queries run locally. A Client query waits for the first valid page response within the configured timeout; otherwise it reports a Client failure or asks you to reconnect and retry. This Tool cannot invoke business Service methods or modify the runtime.",
		parameters: {
			type: 'object',
			properties: {
				platform: { type: 'string', required: true, description: 'Runtime platform that owns the Provider.' },
				provider: { type: 'string', required: true, description: 'Exact Provider ID returned by cordis_inspect_list.' },
				method: { type: 'string', required: true, description: 'Exact method name declared by the Provider manifest.' },
				input: { type: 'json', description: 'Optional query input; it must satisfy the method input schema.' },
			},
		},
	},
]

/** 内置样本的工具集（原文取自 DSH 源码；工具名与参数名保持英文）。 */
const BUILTIN = [
	{
		name: 'read',
		description: 'Read a UTF-8 text file and return line-numbered content.',
		parameters: {
			type: 'object',
			properties: {
				file_path: { type: 'string', description: 'Path to read, resolved by the filesystem backend.' },
				offset: { type: 'number', description: '1-based first line to return. Defaults to 1.' },
				limit: { type: 'number', description: 'Maximum number of lines to return. Defaults to 2000.' },
			},
		},
	},
	{
		name: 'glob',
		description: 'Find files, not directories, whose paths match a glob pattern, including hidden and ignored files. Returns up to 100 paths in modification-time order; a larger result keeps the first paths and reports where the complete list was saved.',
		parameters: { type: 'object', properties: { pattern: { type: 'string', description: 'Glob pattern to match file paths against (for example "**/*.ts", "src/**/*.test.js").' } } },
	},
	{
		name: 'grep',
		description: 'Search file contents with a ripgrep regular expression. Returns matching lines with line numbers, grouped by file. Returns up to 250 matches; a larger result reports where the complete match list was saved.',
		parameters: { type: 'object', properties: { pattern: { type: 'string', description: 'Regular expression to search for (ripgrep syntax).' } } },
	},
	{
		name: 'present',
		description: 'Declare existing files as final deliverables for the user. Use it when the user needs a separate file, especially Office documents, spreadsheets, and slide decks; prefer your final response when that suffices. The user opens the current files; their contents are not copied.',
		parameters: {
			type: 'object',
			properties: {
				files: { type: 'array', required: true, description: 'Usually the 1-2 most important deliverables; at most 4 per call.' },
			},
		},
	},
	...CORDIS_TOOLS,
	/**
	 * 0.2.1-rc.1 才补进表的两类文本：创造模式启用的 plugin_manager，以及 workflow 的
	 * 参数（含嵌套的 meta.phases）。放在内置样本里，防止以后改表时又把它们丢掉。
	 */
	{
		name: 'plugin_manager',
		description: 'List plugins or bundles in the current profile, enable or disable them, install a bundle, or remove an installed bundle. Every action requires danger-full-access permission or approval for this call. Approval does not change the session permission mode. Changes affect every session in this profile. List first to obtain exact identifiers. Package installation can execute allowed build scripts. Live profiles apply changes immediately, including upgrades of installed packages; a change result that is not applied carries nextStep, which says what to do or tell the user. Unmet DSH version requirements (engines.dsh, else DSH peer dependencies) block installation and activation. Version exemptions risk crashes and data loss: warn the user and obtain explicit permission for the exact plugin and runtime versions before granting one.',
		parameters: {
			type: 'object',
			properties: {
				action: { type: 'string', description: 'Management operation.' },
				target: { type: 'string', description: 'Plugin entry id, bundle package name, or installation spec, according to action. For an Official catalog entry, pass list_bundles installTarget.spec to install_bundle.' },
				limit: { type: 'number', description: 'List page size, from 1 to 100; defaults to 25.' },
			},
		},
	},
	{
		name: 'workflow',
		description: `Run a JavaScript workflow script that orchestrates subagents at scale. Use this for work that fans out across many independent pieces — an audit over many files, a migration, multi-angle research, adversarial verification of findings — where you write the orchestration as a script instead of delegating turn by turn.

Script-body hooks:
- \`agent(prompt, opts?): Promise<any>\` — run one subagent to completion. Without \`opts.schema\` it resolves to the child's final text; with \`opts.schema\` (an object-rooted JSON Schema using ONLY type/properties/required/additionalProperties/items/enum/const/oneOf) it resolves to the validated object. Resolves \`null\` when the child fails (filter with \`.filter(Boolean)\`). Other opts: \`label\` (display), \`phase\` (progress group), and independent \`provider\`/\`model\` LLM target overrides.
- \`pipeline(items, ...stages): Promise<any[]>\` — run each item through the stages independently with NO barrier between stages (prefer this for multi-stage work). Each stage receives \`(prev, item, index)\`. A stage throw drops that ITEM to \`null\` and skips its remaining stages.
- \`parallel(thunks): Promise<any[]>\` — run zero-argument functions concurrently and await ALL of them (a barrier; use only when a stage genuinely needs every prior result together). A throwing thunk resolves to \`null\`.
- \`phase(title)\` — start a progress phase; \`log(message)\` — narrate progress; \`args\` — the tool call's \`args\` input, verbatim.

Misused hooks (bad arguments, unknown options, unsupported schemas, tripped caps) end the whole script instead of producing \`null\`. The script has no filesystem, network, timer, or Node.js APIs; the agents do the work.`,
		parameters: {
			type: 'object',
			properties: {
				script: { type: 'string', description: 'The plain JavaScript body, not TypeScript and without an `export const meta` statement; top-level await is allowed. End with `return <value>`; the JSON-serializable value is this tool\'s result.' },
				meta: {
					type: 'object',
					description: 'The workflow identity as plain JSON, not code.',
					properties: {
						name: { type: 'string', description: 'Short kebab-case workflow name.' },
						description: { type: 'string', description: 'One-line description of what the workflow does.' },
					},
				},
				args: { type: 'object', description: 'Optional JSON input exposed to the script as the `args` global (wrap a bare list as a field, e.g. {"files": [...]}).' },
			},
		},
	},
]

const tools = listFile === undefined
	? BUILTIN
	: (() => {
		const raw = JSON.parse(fs.readFileSync(listFile, 'utf8'))
		const list = Array.isArray(raw) ? raw : (raw?.data?.tools ?? raw?.tools ?? [])
		if (!Array.isArray(list) || list.length === 0) throw new Error('没有从清单里解出 tools 数组')
		return list
	})()
console.log(listFile === undefined ? '输入：内置创造模式样本（' + tools.length + ' 个工具 + ' + PROBE_SECTIONS.length + ' 段 section 原文）' : '输入：' + listFile)

const cwd = process.cwd()
/** 真实组装里的工作目录上下文：名字与形状见 `dsh-working-directory` 的 `contextText()`。 */
const workdirContext = directory => ({ name: 'working-directory:current', text: `Current working directory: ${JSON.stringify(directory)}.`, interpolate: false })
const sections = [{ name: 'harness:identity', text: IDENTITY_EN }, ...PROBE_SECTIONS]
const variables = { provider: 'deepseek', model: 'deepseek-flash' }

/** 用指定工作目录跑一次组装：身份段不该因此有任何变化。 */
const assemble = async (workdir = cwd, toolList = tools) => handler(null, null, async () => ({
	sections,
	contexts: [workdirContext(workdir)],
	tools: toolList,
	variables,
}))
const first = await assemble()
const second = await assemble()

// ── 1. 身份段与 section 数量 ──────────────────────────────────────────────────
if (first.sections.length !== sections.length) {
	throw new Error('section 数量被改变：' + sections.length + ' -> ' + first.sections.length + '（身份段应走按名注入）')
}
const identity = first.sections.find(section => section.name === 'harness:identity')
if (identity === undefined) throw new Error('身份段丢失')
if (identity.interpolate !== false) throw new Error('身份段没有钉 interpolate: false')
// 「缓存契约」：身份段位于系统提示词最前面（order -1000），一旦嵌了工作目录这类环境值，
// 每个项目目录都会得到一份不同的系统提示词，前缀缓存从第一个变化的 token 起全部失效。
if (identity.text.includes(cwd)) throw new Error('身份段里嵌了工作目录，系统提示词会随项目变化：' + cwd)
if (identity.text.includes('{{')) throw new Error('身份段里留下了提示词变量占位符')
if (!identity.text.includes('行动边界')) throw new Error('身份段没有注入行为纪律')

// 创造模式是**原生呈现**（没有 run_code），所以"批量化调用工具"那一节必须在——它只在
// 直接调用工具时有意义，正是这个模式的做法。仓颉版（PTC）反过来断言它不存在。
const DISCIPLINE_MARKERS = ['行动边界', '停下来先问的硬边界', '提问而不是内耗', '批量化调用工具']
for (const marker of DISCIPLINE_MARKERS) {
	if (!identity.text.includes(marker)) throw new Error('身份段缺少纪律小节：' + marker)
}
console.log('身份段：按名注入，含 ' + DISCIPLINE_MARKERS.length + ' 项纪律，interpolate=false，无工作目录等环境文本')

// ── 2. 变量检查（照 harness 的规则复查）──────────────────────────────────────
const VARIABLE_NAME = /^[a-z][a-z0-9_]*$/
const variableProblems = []
for (const section of first.sections) {
	if (section.interpolate === false) continue
	for (const matched of String(section.text).matchAll(/\{\{([^{}]*)\}\}/g)) {
		const name = matched[1]
		if (!VARIABLE_NAME.test(name)) variableProblems.push(section.name + ': "{{' + name + '}}" 不是合法变量名')
		else if (!(name in variables)) variableProblems.push(section.name + ': "{{' + name + '}}" 未注册')
	}
}
if (variableProblems.length > 0) {
	console.log('=== 会让组装失败的提示词变量（' + variableProblems.length + '）===')
	for (const problem of variableProblems) console.log('  ' + problem)
	process.exitCode = 1
} else {
	console.log('未注册变量检查：通过')
}

// ── 3. 幂等 + 环境无关性（缓存契约）─────────────────────────────────────────
if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('翻译不幂等：两次结果不同')
console.log('幂等：通过（同一输入两次结果逐字相同）')

const otherCwd = process.platform === 'win32' ? 'D:\\another\\project' : '/home/someone/another-project'
const elsewhere = await assemble(otherCwd)
if (JSON.stringify([elsewhere.sections, elsewhere.tools]) !== JSON.stringify([first.sections, first.tools])) {
	throw new Error('系统提示词随工作目录变化：身份段里还有环境相关文本')
}
console.log('环境无关性：换工作目录（' + otherCwd + '）后，sections 与 tools 逐字节相同')

// ── 4. section 与工具 schema 的覆盖率 ────────────────────────────────────────
// 两类文本都过一遍**真实的翻译路径**：section 走 assemble 的 sections，工具 schema 走 tools
// （创造模式与标准模式一样，工具描述直接发布，没有 `tools:sdk` 中转）。
const tableText = fs.readFileSync(new URL('./maliang-zh.mjs', import.meta.url), 'utf8')

/** 收集待翻译文本：原文 -> 标签（同一原文只保留首次出现的标签）。 */
const originals = new Map()
const add = (text, label) => { if (typeof text === 'string' && text.length > 0 && !originals.has(text)) originals.set(text, label) }
/** 递归收集：`translateTool` 翻的是整棵参数表，嵌套的 `properties` / `items` 同样要检查。 */
const collect = (schema, label) => {
	if (schema === null || typeof schema !== 'object') return
	add(schema.description, label)
	const properties = schema.properties
	if (properties !== null && typeof properties === 'object') {
		for (const [name, property] of Object.entries(properties)) collect(property, label + '.' + name)
	}
	const items = schema.items
	if (items !== null && typeof items === 'object') collect(items, label + '[]')
}
for (const section of PROBE_SECTIONS) add(section.text, 'section:' + section.name)
for (const tool of tools) {
	if (tool === null || typeof tool !== 'object' || typeof tool.name !== 'string') continue
	add(tool.description, tool.name)
	collect(tool.parameters, tool.name)
}

const missing = []
const escaped = []
let alreadyChinese = 0
let hit = 0
for (const [text, label] of originals) {
	if (CJK.test(text)) { alreadyChinese++; continue }
	const before = { name: label, text }
	const after = await handler(null, null, async () => ({
		sections: [before],
		contexts: [],
		tools: [{ name: 'probe', description: text, parameters: { type: 'object', properties: {} } }],
		variables,
	}))
	const sectionChanged = after.sections[0].text !== text
	const toolChanged = after.tools[0].description !== text
	if (sectionChanged || toolChanged) { hit++; continue }
	if (tableText.includes(text)) missing.push({ label, text })
	else escaped.push({ label, text })
}
const total = originals.size
console.log('')
console.log('提示词文本: 去重 ' + total + ' 条（' + PROBE_SECTIONS.length + ' 段 section + ' + tools.length + ' 个工具）')
console.log('  已汉化: ' + hit)
console.log('  原本就是中文: ' + alreadyChinese)
console.log('  未汉化·表里确实没有这条原文 [miss]: ' + missing.length)
console.log('  未汉化·表里有原文却没命中（转义或版本漂移）[escape/drift]: ' + escaped.length)
for (const item of missing.slice(0, 30)) console.log('    [miss] ' + item.label + ' :: ' + item.text.slice(0, 100))
for (const item of escaped.slice(0, 12)) console.log('    [escape/drift] ' + item.label + ' :: ' + item.text.slice(0, 100))
console.log('')
console.log('覆盖率: ' + (((hit + alreadyChinese) / Math.max(1, total)) * 100).toFixed(1) + '%')

// ── 5. 技能目录路径（`agent/pre-step`）、四条创造模式指引、幂等 ──────────────
// 技能目录不经过 assemble：它以 `<system-reminder>` 注入 user 消息。**它的重发判定与文本无关**
// ——`dsh-tool-skill` 用 entries 的结构化 digest 决定是否注入，本插件只换文本、保留 message id
// 与 source，所以翻译不会让目录每个 step 重发。这里守住另一件事：改写必须**幂等**。
const CORDIS_SKILLS = [
	{ name: 'agent-experience', description: 'Use when writing or changing a model-facing tool definition (name, description, parameter schema, or its system-prompt section), and when designing skills, context loading, or multi-step workflows, to make information discoverable and use context efficiently.' },
	{ name: 'cordis-plugin-development', description: 'Use when designing, reviewing, adding, enabling, disabling, installing, configuring, or debugging a plugin, bundle, feature, page, panel, tool, or MCP connection in the current Harness profile, including a shipped plugin that is disabled by default, and for any visual object, decoration, or widget request that names no other destination, which means an installed UI plugin rendered in the Harness Web UI.' },
	{ name: 'editing-cordis-compositions', description: 'Use when creating, changing, or validating an agent preset or other Cordis composition for this harness, including deciding host versus preset placement and checking that an authored preset mounts.' },
	{ name: 'cordis-composition-reference', description: 'Use when writing or reading a Cordis bundle patch or agent preset for this harness and you need the Loader YAML dialect (insert, override by id, group, disabled, isolate, !!js) or the list of installable Harness plugin packages and what each provides.' },
]
// 0.2.1-rc.1 把 office 技能拆成 7 个入口并改写了描述；样本用新的两条，确保新条目一直在表里。
const OFFICE = [
	{ name: 'office', description: 'Create, edit, inspect, or convert Office documents, spreadsheets, presentations, and PDFs. Load to choose the relevant workflow.' },
	{ name: 'office-docx', description: 'Create, read, edit, and validate Word documents (.docx).' },
]
const CATALOG = [
	'<system-reminder>',
	'A skill is a reusable set of task-specific instructions. The following skills are available in this session:',
	'',
	'<available_skills>',
	...[...CORDIS_SKILLS, ...OFFICE].map(skill => '- `' + skill.name + '`: ' + skill.description),
	'</available_skills>',
	'',
	'</system-reminder>',
].join('\n')

if (stepHandler === undefined) throw new Error('未注册 agent/pre-step 监听')
const runStep = async text => {
	const decision = await stepHandler(null, async () => ({ kind: 'continue', messages: [{ id: 'm1', role: 'user', content: [{ type: 'text', text }], source: { kind: 'skill-catalog', form: 'catalog' } }] }))
	return decision.messages[0].content[0].text
}
const catalogOnce = await runStep(CATALOG)
const catalogTwice = await runStep(catalogOnce)
if (catalogOnce === CATALOG) throw new Error('技能目录没有被翻译')
if (!catalogOnce.includes('技能是一组可复用的')) throw new Error('技能目录的引导句没有翻译')
if (catalogTwice !== catalogOnce) throw new Error('技能目录翻译不幂等：第二次又改动了')

// 四条创造模式指引的描述必须各自被翻到——它们只在这个预设的技能目录里出现，没有别处会把关。
const untranslated = CORDIS_SKILLS.filter(skill => catalogOnce.includes(skill.description))
if (untranslated.length > 0) throw new Error('创造模式指引的描述没被翻译：' + untranslated.map(skill => skill.name).join(', '))
console.log('技能目录：已翻译且幂等；四条创造模式指引（' + CORDIS_SKILLS.map(skill => skill.name).join('、') + '）的描述均已汉化')
