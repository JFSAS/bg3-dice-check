# 素材与可选提取工具

当前网页需要的素材均已包含在仓库中，直接启动即可。无需安装提取工具。

- `assets/dice/`：25 张默认骰子序列帧图与帧索引。
- `assets/ui/`、`assets/icons/`：界面、特效和属性图标，共 35 张图片。
- `assets/fonts/`：中文、Regular 和 Bold 三个字体文件。
- `assets/audio/`：32 条原版媒体解码后的 WAV，以及事件树、延迟、随机分支和源哈希。
- `assets/native-animation.json`：从原版动画定义导出的关键帧。
- `source-reference/`：原版布局、动画、字体与颜色主题 XAML。

来源和验证记录见 [原始资源说明](../原始资源说明.md)。此仓库包含网页所需资源，不包含游戏安装包、完整 PAK 或提取工具二进制。

## 可选：重新提取原始定义

Windows 提取脚本使用 [Norbyte LSLib](https://github.com/Norbyte/lslib) 的 Divine；当前素材使用 v1.20.4 提取。下载官方工具并具备其所需的 .NET 运行时后，可执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Extract-GameAssets.ps1 `
  -GameData 'D:\SteamLibrary\steamapps\common\Baldurs Gate 3\Data' `
  -Divine 'D:\Tools\LSLib\Divine.exe'
```

也可以传入 `-Divine 'D:\Tools\LSLib\Divine.dll' -DotNet 'D:\Tools\dotnet\dotnet.exe'` 使用便携 .NET。脚本只读取游戏包，默认提取到 `.local-assets/extracted/`，不会自动覆盖随仓库提供的网页资源。游戏版本变化后，应检查新定义和网页播放器的兼容性。

将新的 `DiceAnimation.xaml` 放到 `source-reference/` 后，可用 Python 3 重新导出动画数据（只用标准库）：

```sh
python scripts/export_animation.py
```

图像转换采用 Pillow 的 DDS 解码与无损 WebP 编码，并检查 RGBA 完全一致。声音使用 [wwiser](https://github.com/bnnm/wwiser) v20260808 解析 `UI.bnk` + `Init.bnk`，再用 [vgmstream](https://github.com/vgmstream/vgmstream) r2117 解码 PCM WAV。提取脚本和动画导出脚本并不构成完整的图像、音频自动重建流程；仓库中已提供可运行的结果。
