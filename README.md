# BG3 Dice Check

《博德之门 3》单骰检定的网页移植。使用个人 Windows 游戏安装中的原始骰子、检定界面、字体、特效和声音，支持自定义问题、DC 与两项加值。

## 启动

仓库包含网页使用的全部图片、字体、声音、动画数据与原版 XAML。下载 GitHub ZIP 后先解压，或克隆仓库，然后双击启动：

- **Windows：双击 `启动.cmd`。**
- **macOS：双击 `启动.command`。**

启动器自动打开默认浏览器。若没有 Node.js 18 或更高版本，首次启动会从 [Node.js 官网](https://nodejs.org/) 下载便携版 Node.js 22，并按官方 SHA-256 清单校验，存放于项目的 `.local-runtime/`，不修改系统安装。第一次下载需要联网；后续使用本地运行时，游戏素材无需另行下载。

macOS 通过 ZIP 下载可能丢失执行权限，遇到无法运行时，在终端进入项目目录执行 `chmod +x 启动.command`。通过 Git 克隆会保留执行权限。保持启动窗口开启；关闭窗口或按 Ctrl+C 停止服务。

也可以在已有 Node.js 的终端中运行（没有第三方 npm 依赖，无需 `npm install`）：

```sh
npm start
```

打开 http://127.0.0.1:4173/ 。默认只监听本机，可通过 `PORT` 指定端口。

刷新后等待素材加载，点击骰子开始检定。浏览器要求首次用户操作后才能播放声音；右下角可以开关音效，以及打开自定义检定和历史记录。

## 当前实现

- 默认 D20 待机、滚动与点数揭示。
- 原版金色框架、加值卡片、属性／熟练图标、提示框和字体。
- 从 `DiceAnimation.xaml` 导出的 62 条关键帧轨道，支持待机闪光、加值汇入、成功／失败效果。
- 从 `UI.bnk` 与 `Init.bnk` 解析并解码的 32 条音轨，保留分层、延迟、随机变体和正负加值分支。
- Web Crypto 等概率 D20；可选天然 1 自动失败、天然 20 自动成功规则。
- 自定义问题、背景说明、检定名称、DC 和两项加值，历史保存在浏览器本地。

## Agent 集成接口

目前提供浏览器接口，还没有接入个人 Agent 服务。

```js
window.FateCheck.configure({
  question: '要不要开始那个一直想做的项目？',
  context: '迈出第一步。',
  skill: '勇气检定',
  dc: 12,
  ability: 2,
  abilityLabel: '充分准备',
  proficiency: 1,
  proficiencyLabel: '经验积累',
  critical: true
});

window.addEventListener('fate-check:result', ({ detail }) => {
  console.log(detail.roll, detail.total, detail.success, detail.critical);
});
```

`getConfig()`、`getState()`、`getHistory()` 可读取当前配置、加载／检定状态与历史。检定进行中禁止修改配置。

## 验证

```sh
npm run check
npm test
npm run test:native
```

测试包括 DC 边界、天然 1／20、无偏随机映射，以及模拟环境中的素材加载、声音调度、结果动画、正负加值、自定义检定和再次掷骰流程。模拟检查不等于真实浏览器视觉与听觉验收。

## 素材来源与当前限制

游戏素材取自个人安装的 `Game.pak` 和 `SharedSoundBanks.pak`，提取后没有修改游戏安装文件。原始 DDS 转换为无损 WebP 并验证 RGBA 像素一致，声音解码为 PCM WAV。素材、字体和游戏定义的权利属于各自权利人；此仓库不授予这些游戏资源的再分发许可。

详细来源、哈希、转换和还原边界见 [原始资源说明.md](原始资源说明.md)、[图像来源清单](assets/original-provenance.json) 和 [音频来源清单](assets/audio/manifest.json)。

当前是单骰、鼠标键盘界面的移植；不是 100% 完整复刻。游戏实录逐帧对比和真实浏览器试听仍未完成。网页背景不包含游戏 3D 场景，部分运行时布局绑定和音频混音通过浏览器实现。设置与历史弹窗为网页功能。

## 文件结构

| 路径 | 内容 |
| --- | --- |
| `index.html` / `style.css` | 检定界面与自定义设置 |
| `app.js` | 配置、随机检定、流程与历史 |
| `native-engine.js` | 原版关键帧与音轨事件的浏览器播放器 |
| `assets/` | 随仓库提供的素材、字体、音轨与来源记录 |
| `source-reference/` | 提取的原版布局、动画与主题定义 |
| `tests/` | 规则测试与模拟运行验证 |
| `server.mjs` / `launch.mjs` | 本地静态服务器与自动打开浏览器 |
| `启动.cmd` / `启动.command` | Windows / macOS 双击启动入口 |
| `scripts/` | 便携运行时启动、可选原始资源提取与关键帧导出 |
