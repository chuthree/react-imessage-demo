<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/apple-touch-icon-dark.png" />
    <img src="public/apple-touch-icon.png" width="80" height="80" alt="iMessage demo 图标" />
  </picture>
</p>

<h1 align="center">iMessage demo</h1>

<p align="center">
  用 React 复现 iMessage 的聊天界面与交互<br />
  支持中英文，以及跟随系统的浅色、深色模式
</p>

<p align="center"><a href="README.md">English</a> · <strong>简体中文</strong></p>

<a href="https://imessage-demo.chu3.top/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/preview-dark.png" />
    <img src=".github/assets/preview-light.png" alt="iMessage demo 的照片、引用回复与回应展示" width="1200" />
  </picture>
</a>

## 功能

- 消息发送、已读回执、正在输入状态，以及发送、接收和回应音效
- 长按或右键拷贝、回复消息，查看同一线程的回复
- 点击「+」选择照片或拍照，每次最多两张；每张照片可单独回复和显示回应
- 玻璃材质，主题跟随系统；语言默认跟随浏览器，桌面左下角可切换并记住选择
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

## 使用说明

Enter 换行，Ctrl / Command + Enter 发送，也可点击发送按钮。

消息和选择的照片仅保存在当前页面，不会上传，刷新后重置。

## 声明

本项目仅供学习、界面研究与非商业演示，与 Apple Inc. 无关联，也未获其认可或赞助。

Apple 相关素材及系统字体衍生数据归 Apple Inc. 或相应权利人所有，保留所有权利。

素材来源与许可见 [CREDITS](CREDITS.md)。
