# OmniPost Agent 分工

先读 `specs/product.md`。企业主必须能在手机上随时用，不要只做电脑后台。

派活时用 `.cursor/agents/` 里的角色，不要一个人改完全栈：

| 角色 | 何时用 |
|---|---|
| `spec-keeper` | 改需求、写验收、模块打架时先对齐规格 |
| `owner-mobile` | 企业主 App、推送、审批、手机待办 |
| `ops-workspace` | Next.js 工作台、PWA、日历/写稿/账号页 |
| `publisher` | 微博/公众号/小红书/X/FB/IG、OAuth、高峰队列 |
| `growth` | 获客活动、线索、达人 CRM |
| `platform-admin` | `/admin`、租户、登录权限、Docker Postgres |

实现前对照 `specs/surfaces.md`：这件事该出现在手机 App、工作台，还是 Docker 后台。
