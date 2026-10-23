# 更新记录

按版本从新到旧。每段标题就是 tag 名（`## [2026.10.12] - 2026-10-12`）——推 tag 时由
`.github/workflows/release.yml` 把这一段抽出来当 Release 报告。
所以发版的规矩只有一条：**先在文件顶上补一段，再打标签**。抽不到那一段（或那一段是空的），
Release 就退回 GitHub 自动生成的提交清单。

版本号用日期式（`2026.10.12`），与 `package.json` 的 `version`、tag 名同号。

## [2026.10.23] - 2026-10-23

### 适配 0.2.1-rc.2 的 Agent Teams，恢复被删的工具描述

- 与仓颉、雅言同一张表：`team:policy` 换成 rc.2 的新措辞（含 `interrupt=true/false`
  两版）、`send_message` 去掉 durable、`wait_agent` 的 mailbox 改为 message，并新增
  `team:identity` 的 Lead 精确键与队友正则。
- 10.20 按「本预设挂不到的包」删掉的条目里，有 6 个工具是**会到达** cordis 会话的：
  `agent-team-profile` 是 profile 层 bundle，装上之后工具注册在 agent 作用域，与预设无关。
  `spawn_teammate`、`list_agents`、`team_task_create/list/get/update` 及全部参数描述
  已补回 `PROSE`。
- 回放 0.2.1-rc.2 原文：policy 19/19 句、35 条工具描述、两种身份段全部命中。

## [2026.10.21] - 2026-10-21

### 同步 `run_code` 的 0.2.1-rc.2 文案

- 与仓颉、雅言同一张翻译表：0.2.1-rc.2 把 `run_code` 改成 `code` 在前、`description` 在后，
  并删掉 `description` 参数说明里的顺序句；两条旧条目已按新原文替换。
- 创造模式不挂 `run_code`，但表与最新版保持一致，免得下一次同步时再踩同一个坑。
- 兼容基线改为 **0.2.1-rc.2 + 0.2.1-alpha.5**。

## [2026.10.20] - 2026-10-20

### 合并 DOCS 表：把漏译补进 PROSE，删掉不可达的整层

原来这套汉化有两张表：`PROSE`（所有提示词文本）与 `DOCS`（只服务 PTC 的 `tools:sdk`
JSDoc）。马良覆盖的是 `cordis`（创造模式），工具说明直接作为独立 schema 的 `description` 发布，
**永远不会以 `/** ... *\/` 的形态出现**，所以 `DOCS` 这一层一次都命中不了。代价不是浪费
代码，而是**漏译**：有 101 条工具描述只写在 `DOCS` 里，创造模式下只能露出英文。

- `DOCS` 里创造模式**会到达**的条目（`ask_user_question` 的 7 个参数、`edit`/`write`
  的路径、`grep`、`job_kill`、`read_image`、`web_search`、`todo`、plan-mode、
  schedule 的 cron 参数等）已并入 `PROSE`，改走 `translateTool` 这条主路径。
- 属于本预设**挂不到**的包（Agent Teams、terminal、session-query、worktree、ralph）的
  78 条直接删除——按 `packages/bundle/*/cordis.patch.yml` 核对过，这些工具行不在
  `cordis` 预设里，宿主层也没有挂载。
- 随之删除 `DOC_RE`、`unescapeDoc()`、`escapeDoc()`，以及 `translateText` 里的
  JSDoc 分支：替换规则从「四层」收敛为「三层」（精确段落 → 正则 → 子串）。

实测：`PROSE` 从 154 条增至 409 条，409 条逐条喂进真实的 `translateTool` 路径全部能翻出；
`self-test` 全绿，覆盖率仍是 100%。


## [2026.10.17] - 2026-10-17

### 适配 dsh 0.2.1-rc.1

- 基准版本收敛为 **0.2.1-rc.1**（Web 的全局 npm 包与 Desktop 内置运行时都是它）。shipped
  `cordis` 逐行重述时补上 `tool-schedule` 与 `tool-plugin-market`（后者按 shipped 用
  `!!js "!ctx.get('profileContext')"` 条件式），删除 rc.2 遗留的 `tool-subagent-codex` /
  `tool-subagent-claude-code` / `tool-ralph` 三行，按 rc.1 的 shipped 去掉 subagent 的
  `backgroundMode`；plan-mode 首句按 rc.1 措辞重译。
- 补译 rc.1 仍是英文的提示词：`plugin_manager`（创造模式启用）的整条描述与 9 个参数、
  `plugin_market` 的描述与参数、`workflow` 的顶层与嵌套参数（`meta.phases`）、
  `bash` 的 guidance 与描述，以及 office 技能拆成 7 个入口后的全部新描述。
- `translateTool` 改为递归翻译整棵参数表（原来只翻顶层，`workflow.meta.*` 这类嵌套描述会漏）。
- `audit-coverage.mjs` 对工具文本同时测 schema 路径与 JSDoc 路径，减少假缺口。
- `self-test.mjs` 内置样本加入 `plugin_manager`、`workflow`（含嵌套参数），技能目录样本改用
  rc.1 的 office 新描述，覆盖率保持 100%。

### 补遗：装上之后仍有英文的三处缺口

- `harness:source` 与 `app:web-surface` 两段说明：rc.1 把「实现代码检出目录」与「Web GUI URL」
  挪进运行时上下文，段落本体改成 path-free 的固定文案，旧表只认带路径的版本——补上两段新原文。
- `schedule` 参数说明：rc.1 改写了 task title 的措辞（`Concise task name in the user's language…`、
  `New task name; follow the schedule_create title rules.`），并新增两条 `HH:mm:ss`、
  `UTC or IANA Area/Location`、`ISO weekdays` 四条参数说明；含 JSDoc 闭合符的 `cron` 那条走
  `DOCS` 层。
- 运行时上下文的三条动态条目（`Current working directory`、实现代码检出目录、Web GUI URL）
  补正则映射。
- `run_code` 段说明：rc.1 把参数语序改成逗号式（`code`, … , and `description`），旧表只收
  破折号式与前置式两代——补 rc.1 原文与 `repl` 变体。

## [2026.10.12] - 2026-10-12

### 首次以 dsh 插件包发布：马良模式

- 新增本包，把原生的**创造模式（`cordis` 预设）**汉化：`package.json` 的 `dsh.bundle.patch`
  指向包内 `cordis.patch.yml`，后者按 Loader 行 id **覆盖** `@deepseek-ai/dsh-web-app` 那份
  `preset-cordis`（顶层 `- id: preset-cordis` 且不带 `insert`）。安装、更新、卸载全部交给 dsh
  自己的插件管理（插件页，或 `dsh plugin --profile <p> add github:Alm-Allen/dsh-maliang-preset`）。
- 界面里**不新增条目**：仍是原生的「创造模式」（`dsh-client-ui-agent-preset` 的
  `presetCordisName`），名字、位置、`config.id = cordis` 全部照旧，本包只换掉它加载的插件列表
  （多一个中文化层 `maliang-zh`，persona 置空）。dsh 自己会在组合结果里标注归因：
  `# == @deepseek-ai/dsh-web-app, patched by @alm-allen/dsh-maliang-preset`。
- 汉化层 `maliang-zh.mjs` 与雅言（`standard`）**同一张表、同一套机制**：创造模式与标准模式都是
  **原生呈现**（没有 `run_code` 中介），`translateTool` 逐个工具翻译 `description` 与参数描述
  就是主路径。创造模式多出来的到达面已核对覆盖：
  - `cordis_inspect_list` / `cordis_inspect_query`（`@deepseek-ai/dsh-tool-cordis`）的工具描述
    与参数描述在表里；
  - `skill-filesystem` 的 `customSkillDirs` 挂出的四条开发指引（`agent-experience`、
    `cordis-plugin-development`、`editing-cordis-compositions`、`cordis-composition-reference`）
    的**描述**在表里，走 `agent/pre-step` 的技能目录路径翻译；技能正文是随包出货的文件，不改；
  - `workflow-ptc` / `tool-workflow` 在这个预设里是**启用**的（PTC 那边整组关掉），它们的工具
    描述与 guidance 也在表里。
- 组合逐行照抄 shipped `cordis`，三处必须原样保留的地方都没有简化：
  `skill-filesystem.config.customSkillDirs` 的 `!!js` 表达式（Loader 评估时提供 `baseUrl`，
  它解析到本机那份 `dsh-agent-preset` 的 `skills/`）、`tool-plugin-manager` 的
  `disabled: !!js "!ctx.get('profileContext')"`（与 `standard`/`ptc` 的 `disabled: true` 不同，
  创造模式"让 Agent 创建插件"正是靠它）、以及 workflow/ralph 那一组与 shipped 相同的启用/禁用
  状态（`tool-ralph` 保持 `disabled: true`）。
- 两版兼容（一份 patch 同时服务 `0.2.0-rc.2` 与 `0.2.1-alpha.2`），基准取 rc.2 的 shipped 逐行
  重述。两版 shipped `cordis` 的差异已核对：rc.2 有 `tool-subagent-codex` /
  `tool-subagent-claude-code` / `tool-ralph`（三行都 `disabled: true`），persona 带
  `suffix: Your working directory is {{cwd}}.`，没有 `time-context` / `tool-schedule`；
  alpha.2 没有那三行，改挂 `time-context` 与 `tool-schedule`，给两个启用的 subagent 行加了
  `toolFilter.deny`，persona 只有 `prefix`。另外两版的 plan-mode 首句措辞不同，本包的中文对应
  **rc.2** 那一版。
- `tool-schedule` **故意不收录**：rc.2 的包里没有 `@deepseek-ai/dsh-tool-schedule`（只有
  `dsh-schedule`），而一行引用不到的包会让整个预设激活失败、组不成会话。代价是 Desktop 上少
  一个 schedule 工具行（属可选能力）。`time-context` 两版都有包故收录，Desktop 因此不比原生
  创造模式少这项；alpha.2 的 `toolFilter` 未跟随——它在 rc.2 的 schema 里未必被接受，而不 deny
  的唯一后果是 subagent 可能多看到几个 schedule 工具，本文件根本没挂那几行。
- 自测与审计脚本（`self-test.mjs`、`audit-coverage.mjs`）一并进包。`self-test.mjs` 除了四条通用
  纪律（section 数量、未注册变量、幂等、环境无关），还单独断言技能目录里那四条创造模式指引的
  描述必须被翻到。
- 缓存与注入审查：`dsh-agent-loop` 的 `RuntimeContextProjection.project()` 拿「自己渲染出的
  文本」与「已落地文本」逐字比较，不等才追加一条 user 消息——两侧同源时恒等、永不重发，只改
  一侧就会每个 step 追加一条。本次没有触碰这条路径：汉化层改的是 `system-prompt/assemble` 的
  渲染侧（落地即同一份文本），`translateMessage` 只处理 `<system-reminder>` 开头的注入块。
  新增的 `time-context` 走 `agent/pre-step` 追加独立 user 消息、默认 10 分钟最小间隔，官方文档
  明确「仅追加；新可见内容位于可复用请求前缀之后，不会使现有 KV Cache 条目失效」，且其文本不
  经过翻译层。另外把 persona 置空顺带修掉了 shipped 本身的缓存漏洞——rc.2 的 persona suffix
  含 `{{cwd}}`，会让系统提示词随工作目录变化。