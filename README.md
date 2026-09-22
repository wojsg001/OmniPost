# OmniPost

一次写稿，按中国互联网高峰发到微博、公众号、小红书和 X / Facebook / Instagram。面向中小企业主：手机上也能审批、跟线索、管达人。规格见 `specs/`，agent 分工见 `AGENTS.md`。

## 启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 http://localhost:3000

### Docker

```bash
docker compose up --build
```

数据写在 volume `omnipost-data`。OAuth 回调和获客短链请设置 `OMNIPOST_BASE_URL` 为你对外的地址。

## 绑定账号

到「账号」页：

- 微博 / X / Facebook / Instagram：先填 App Key，再点「授权登录」
- 公众号 / 小红书：粘贴开放平台凭证后保存
- 也可继续用 `.env` 里的变量作为兜底

未关模拟发布时，绑定后仍只走本地队列。

## 获客

「获客」里创建活动（评论关键词 + 微信 + 赠品）。写稿时挂上活动，各平台文案会自动带钩子。公开短链：`/go/{slug}`，线索进箱子。

## 大模型

「创作台」绑定 OpenAI、DeepSeek、通义、Kimi、智谱、Ollama 或任意 OpenAI 兼容网关。可写脚本、生封面，再送到「写一篇」。没填 Key 时用本地模板和矢量封面，Docker 里也能先跑通。
