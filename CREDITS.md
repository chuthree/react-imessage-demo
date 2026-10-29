# 素材来源

以下列出本 demo 使用的素材来源与相关许可。

- 设备外框、侧键和状态栏：Apple 开发者素材及设备截图，整理为 `src/home/phoneImages.json`。
- 时钟字形与布局：从系统字体导出的 `public/phone-clock/*.json`，不包含字体文件。
- Tapback 与表情：Apple artwork，原来源记录包括 [Figma iMessage Chat Builder](https://www.figma.com/community/file/1519446101653617639/imessage-chat-builder)、作者提供的系统回应图形及 Apple emoji 图集。`zzz-apple.webp` 来自 [Apple 391 emoji 图集](https://em-content.zobj.net/source/apple/391/zzz_1f4a4.png)。
- 相机与照片入口图标：[Apple Messages 支持页](https://support.apple.com/en-us/104969) 的界面截图；复制与回复图标来自系统界面图形。
- 发送、接收及回应音效：iOS 系统采样，文件位于 `public/home/chat/*.wav`。
- 头像与照片：作者提供的头像及 Flashback ONE35 V2 拍摄的咖啡、老屋顶和公园小狗照片，保留作者权利；对话为 demo 编写，并非真实聊天记录。
- 网页图标：使用本项目已有气泡轮廓，在 Icon Composer 中制作浅色、深色外观。可编辑源文件为 `design/iMessage.icon`，网页图标位于 `public/`，不是 Apple 官方应用图标。

Apple 相关图像、系统图形、表情、音效及字体衍生数据归 Apple Inc. 或相应权利人所有。Copyright © Apple Inc. All rights reserved. 本项目不为这些素材另行授予使用许可。

玻璃布局补丁、平滑轮廓和头部渐进模糊分别沿用 [Liquid Glass](https://github.com/samasante/liquid-glass)、[Lisse](https://github.com/JaceThings/Lisse) 和 [Motion Primitives](https://github.com/ibelick/motion-primitives) 的实现，相关许可原文保留在 [third-party-licenses](third-party-licenses/)。其他依赖随各自安装包保留许可，版本以锁文件为准。
