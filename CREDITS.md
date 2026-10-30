# Credits

Original code, documentation, and website icons are licensed under [MIT](LICENSE). The other assets listed below, including their appearances in `.github/assets/preview-*.webp` and `public/og.png`, are excluded from MIT. Third-party code retains its own licenses.

- Device frame, side buttons, and status bar: Apple developer assets and device screenshots, compiled into `src/home/phoneImages.json`.
- Clock glyphs and layout: exported from system fonts into `public/phone-clock/*.json`. No font files are included.
- Tapback and emoji (`src/assets/*-apple.png`, `src/assets/*-apple.webp`): Apple artwork. Recorded sources include [Figma iMessage Chat Builder](https://www.figma.com/community/file/1519446101653617639/imessage-chat-builder), system reaction graphics provided by the author, and Apple emoji collections. `waving-hand-apple.webp` and `zzz-apple.webp` come from the Apple 391 emoji collection ([waving hand](https://em-content.zobj.net/source/apple/391/waving-hand_1f44b.png), [zzz](https://em-content.zobj.net/source/apple/391/zzz_1f4a4.png)).
- Camera and photo picker icons (`src/assets/composer-*.webp`): interface screenshots from the [Apple Messages support page](https://support.apple.com/en-us/104969). Copy and reply icons (`public/home/message-copy.png`, `public/home/message-reply.png`) come from system interface graphics.
- Send, receive, and reaction sounds: iOS system samples, stored in `public/home/chat/*.wav`.
- Avatar and photos (`src/assets/home-avatar.webp`, `src/assets/demo-*.webp`): an avatar provided by the author and author-provided photos of coffee, a lane with a traffic cone, and a dog in a park. The author retains all rights. Conversations were written for the demo and are not real chat records.
- Website icons: light and dark appearances created in Icon Composer using the project's existing speech bubble shape. These are `public/icon.svg`, `public/favicon*.png`, and `public/apple-touch-icon*.png`, and are not official Apple app icons.

Apple-related images, system graphics, emoji, sounds, and data derived from system fonts belong to Apple Inc. or their respective owners. Copyright © Apple Inc. All rights reserved. This project does not grant any additional license to these materials.

The glass layout patch, smooth contours, and progressive header blur are based on [Liquid Glass](https://github.com/samasante/liquid-glass), [Lisse](https://github.com/JaceThings/Lisse), and [Motion Primitives](https://github.com/ibelick/motion-primitives), respectively. Their original license texts are preserved in [third-party-licenses](third-party-licenses/). Other dependencies retain their licenses in their installed packages; see the lockfile for versions.
