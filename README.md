<p align="center">
  <img src="public/apple-touch-icon.png" width="80" height="80" alt="iMessage demo 图标" />
</p>

<h1 align="center">iMessage demo</h1>

<p align="center">用 React 复现 iMessage 的聊天界面与交互</p>

体验消息发送、照片分享和引用回复。基于 React、TypeScript 与 Vite，使用本地固定回复，无需 API 或密钥。

## 功能

- 消息发送、已读回执、正在输入状态，以及发送、接收和回应音效
- 长按或右键拷贝、回复消息，打开同一线程的回复预览
- 照片选择与相机入口，单图与双图展示，按单张照片引用和显示回应
- 玻璃材质、深浅色跟随系统，以及中英文切换
- 桌面端显示 iPhone 外框，小屏幕使用原生页面滚动

## 本地运行

使用 Node.js 24 与 pnpm 12。

```sh
pnpm install
pnpm dev
```

打开终端中显示的本地地址。

```sh
pnpm build    # 类型检查并构建到 dist/
pnpm preview  # 预览构建结果
```

## 操作

- 输入消息后点击发送；Enter 换行，Ctrl / Command + Enter 发送
- 长按或右键消息，选择「拷贝」或「回复」；照片组中的每张照片可单独操作
- 点击「+」选择照片或打开相机，每次最多两张
- 桌面端点击页面左下角的语言图标切换中英文

消息和选择的照片仅保存在当前页面，不会上传，刷新后重置。回复与回应由本地逻辑模拟，桌面手机外框仅作展示。

## 声明

本项目仅供学习、界面研究与非商业演示，与 Apple Inc. 无关联，也未获其认可或赞助。

Apple 相关素材及系统字体衍生数据归 Apple Inc. 或相应权利人所有，保留所有权利。

素材来源与许可见 [CREDITS](CREDITS.md)。
