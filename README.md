# dsh-maliang-preset

把 **DeepSeek Harness（dsh）** 的原生 **创造模式（cordis）** 汉化：装上本包之后，创造模式
本身就说中文——系统提示词、每个工具的 `description` 与参数描述、技能目录里的说明全部汉化，
模型以中文思维链工作；工具名、参数名、代码、命令、路径一律保持原样。

本包**不新增预设条目**，而是按 Loader 行 id **覆盖**随 dsh 出货的 `preset-cordis`：预设列表里
仍然只有原生的「创造模式」，名字、位置、`config.id` 全部照旧，被换掉的只是它加载的插件列表
（多一个中文化层 `maliang-zh`）。停用或卸载本包即恢复原版。

名字叫马良，是因为这个模式本来就在"画"——写插件、造界面、组工具。界面里显示的仍是原生的
**创造模式**，本包不主张任何显示名。

与另外两个包同一套汉化机制、同一张翻译表，差别只在**挂载对象与到达面**：

| 包 | 覆盖的原生预设 | 界面里的名字 | 呈现方式 |
|---|---|---|---|
| [dsh-yayan-preset](https://github.com/Alm-Allen/dsh-yayan-preset) | `preset-standard` | 标准模式 | 原生：每个工具一个独立 schema |
| [dsh-cangjie-preset](https://github.com/Alm-Allen/dsh-cangjie-preset) | `preset-ptc` | PTC 模式 | PTC：工具包成 TypeScript SDK，模型写 `run_code` |
| **本包** | `preset-cordis` | **创造模式** | 原生，外加运行时检查工具与 workflow 面 |

三者中，雅言与马良的到达面几乎相同（都直接发布工具 schema）；创造模式在此之上多两样东西：
`cordis_inspect_list` / `cordis_inspect_query` 两个运行时检查工具，以及
`skill-filesystem` 的 `customSkillDirs` 挂进来的四条开发指引。

本仓库是一个 **dsh 插件（bundle）**，不是安装脚本：`package.json` 里的 `dsh.bundle.patch`
指向包内的 `cordis.patch.yml`，后者覆盖 `preset-cordis` 那一行。安装、更新、卸载都交给
dsh 自己的插件管理。

## 安装

**插件页**：打开 dsh 的 **插件** 页 → **添加插件** → 输入

```
github:Alm-Allen/dsh-maliang-preset
```

**命令行**（`--profile` 换成你的 profile 名，网页端通常是 `web`）：

```sh
dsh plugin --profile web add github:Alm-Allen/dsh-maliang-preset

# 锁死到某个 commit —— 后续推送就改不了你装到的东西
dsh plugin --profile web add github:Alm-Allen/dsh-maliang-preset#<commit-sha>
```

装完重启 dsh、刷新页面，到 **设置 → Agent 预设** 里把会话切到「**创造模式**」即可——它本来
就在列表里，本包只是把它换成了中文的，**不会多出条目**。也可以在**插件页**的**添加插件**
箭头菜单里选「让 Agent 创建插件」，那条路正是以创造模式开一个会话。

- **桌面端**：桌面应用的 profile 是 `desktop`，CLI 对它有额外限制（要先完全退出应用再执行）。
  桌面端直接用**插件**页添加最省事。
- **本地改着玩**：`dsh plugin --profile web add link:<本仓库绝对路径>` 装的是符号链接，
  改完重启即生效。
- **不用它了**：`dsh plugin --profile web remove @alm-allen/dsh-maliang-preset`，
  或直接在插件页停用/卸载。

升级到最新：

```sh
dsh plugin --profile web update @alm-allen/dsh-maliang-preset
```

## 包结构

```
dsh-maliang-preset/
├── package.json                插件清单：name、exports、dsh.bundle.patch
├── cordis.patch.yml            本包贡献的组合层：覆盖原生 preset-cordis 声明
├── plugins/
│   ├── maliang-zh.mjs          汉化层插件本体（零外部 import），同时也是包的入口
│   ├── self-test.mjs           离线自测：翻译覆盖率、纪律注入、技能目录、缓存契约
│   └── audit-coverage.mjs      覆盖率审计：扫 DSH 源码原文，列出漏译条目
└── locale/                     zh / en 两版预设元信息
```

## 装进 profile 之后发生了什么

1. dsh 把包装到 `<profile>/node_modules/`，并把包名写进 `dsh.profile.bundles`——这一步由
   `@deepseek-ai/dsh-plugin-manager` 完成，`dsh plugin` 与插件页是同一条路径；
2. 启动组合时，本包的 `cordis.patch.yml` 作为一层，在 profile 自有 `cordis.patch.yml`
   **之前**应用（顺序见 `@deepseek-ai/dsh-app-boot` 的 profile 装载：各 bundle 的 patch →
   profile 自己的 patch → launcher 的 `--patch`）。本包排在 `@deepseek-ai/dsh-web-app`
   **之后**，所以能覆盖后者 `insert` 出来的 `preset-cordis`；dsh 的组合结果里会标注
   `# == @deepseek-ai/dsh-web-app, patched by @alm-allen/dsh-maliang-preset`；
3. 预设内部那一行按**包名**解析到包入口 `plugins/maliang-zh.mjs`：它挂在
   `system-prompt/assemble` 瀑布（提示词与工具 schema）与 `agent/pre-step`（技能目录注入块）
   上，只做文本替换；
4. 预设是 **agent 平面**的组合：它在 roster 的 standing scope 下挂载一次，选择本预设的会话按
   scope 父子关系加入；各注册表、沙箱与审批栈、持久化、模型路由仍留在宿主组合里，不受影响。

装本包不动你的默认预设**设置**，但它改的是创造模式的**内容**：要生效，会话得选上「创造模式」。

## 自测

```sh
# 用一份工具 schema 清单验证翻译覆盖率（不给参数则用内置的创造模式样本）
node plugins/self-test.mjs <工具清单 JSON 文件>
# 换个方向：扫 DSH 源码里的英文原文，列出没被翻到的条目
node plugins/audit-coverage.mjs <DSH 源码检出目录>
```

工具清单来自 Host 的 `Tool` Inspect provider `listTools`（存成文件即可）；不给参数时用内置
样本跑同样几条纪律。装进 profile 之后，路径换成：

```powershell
node "$env:USERPROFILE\.dsh\profiles\web\node_modules\@alm-allen\dsh-maliang-preset\plugins\self-test.mjs"
```

`self-test.mjs` 断言四件事：section 数量不变（身份段按名注入，不该落到"补一段"的兜底分支）、
没有未注册变量（有的话整份提示词组装抛错）、翻译**幂等**、以及**换一个工作目录后 sections 与
tools 逐字节不变**（前缀缓存契约）。另外它单独守住创造模式专属的一条：技能目录里那四条开发
指引（`agent-experience`、`cordis-plugin-development`、`editing-cordis-compositions`、
`cordis-composition-reference`）的**描述必须被翻到**——它们只在这个预设的技能目录里出现，
没有别的地方会替它们把关。

## 汉化是怎么做的

`maliang-zh.mjs` 监听 Cordis 的 `system-prompt/assemble` 瀑布：`await next()` 拿到下游全部贡献
之后的最终装配结果，本插件只做**文本替换**，不改结构、不改顺序、不增删 section。

替换分三层：精确段落映射 → 正则映射（含路径、URL、数字的动态文本）→ 长段落内的子串替换。
**只替换已知的英文原文**，未知文本原样保留，所以 dsh 升级后新增的工具或段落会以英文出现，
而不会被破坏或丢失。

这里没有 JSDoc 映射：那一层只服务 PTC 的 `tools:sdk` 段，而创造模式下工具说明直接作为独立
schema 的 `description` 发布，永远不会以 `/** ... *\/` 的形态出现。

技能目录不走 `assemble`（它以 `<system-reminder>` 注入 user 消息），所以另有一条
`agent/pre-step` 监听做同样的事——创造模式挂出来的四条开发指引的描述就在这条路径上被翻。

身份段（行为纪律、提问纪律、文件与调用纪律）是唯一的例外：它由插件按 section 名
`harness:identity` 直接写入，不依赖英文原文匹配——上游改写那句话也不会让纪律静默消失。
身份段正文是**与环境无关的常量**：不写工作目录、时间、时区，也不引用任何提示词变量，
写进 section 时钉 `interpolate: false`，所以同一部署内系统提示词前缀恒定。

技能**正文**（`SKILL.md` 的内容）不在翻译范围内：它们是随 dsh 出货的文件，本包不修改别人包里的
东西；模型按需加载时看到的是原文。

## 兼容性

- 零第三方依赖、零构建步骤：仓库里放的就是最终产物，所以 `github:` 直装不需要任何构建授权。
- 翻译表按 **0.2.1-rc.1** 的提示词逐条核对并适配。上游再次改写提示词时，未知文本原样保留为
  英文，用上面的自测（看真实到达面）或审计（看源码全量）自查。
- **基准版本是 0.2.1-rc.1**（Web 的全局 npm 包与 Desktop 内置运行时都是它）。`cordis.patch.yml`
  以该版 shipped `cordis` 逐行重述：收录 `tool-schedule` 与 `tool-plugin-market`，不再保留
  rc.2 时代的 `tool-subagent-codex` / `tool-subagent-claude-code` / `tool-ralph` 三行。
- **升级 dsh 后要回头核对**：override 冻结整份 `config`，shipped 文件若新增或改动了插件行，
  本包不会自动跟随。升级后把 `cordis.patch.yml` 与 `dsh-web-app/presets/cordis.patch.yml`
  对一遍（桌面端该文件在 `app.asar` 内，shell 打不开，但 dsh 自己的 read 工具能读）。
- 本包不声明任何 `@deepseek-ai/dsh*` 的 peer，因此不会被 dsh 的插件兼容性预检拦下；
  它也不注册服务、不碰沙箱与审批栈、不写任何全局配置。

## 更新记录

每个版本的更新记录在 [CHANGELOG.md](./CHANGELOG.md)——打标签发布时，Release 报告就是从它里面抽的。

## 许可

MIT
