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
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/preview-dark.webp" />
    <img src=".github/assets/preview-light.webp" alt="iMessage demo 的照片、引用回复与回应展示" width="1200" />
  </picture>
</a>

## 功能

### 消息与回应

- 消息发送动画、已读回执与正在输入状态
- Tapback 回应动画，以及发送、接收和回应音效

### 引用与回复

- 长按或右键拷贝、回复消息，集中查看同一线程的回复
- 回复视图切换动画，连线随回复弯曲成环，并适应文字与照片的高度

### 照片与界面

- 选择照片或拍照，每次最多两张，支持对单张照片回复与显示回应
- 玻璃材质，浅色、深色模式跟随系统；中英文随浏览器切换，也可手动选择并记住偏好
- 桌面端使用 iPhone 外框，小屏幕使用原生页面滚动

## 本地运行

使用 Node.js 24 与 pnpm 12。

```sh
pnpm install
pnpm dev
```

## 许可证

原创代码与文档采用 [MIT](LICENSE) 许可。

Apple 素材版权归 Apple Inc. 所有，不在 MIT 许可范围内。素材来源及第三方许可见 [CREDITS](CREDITS.md)。
