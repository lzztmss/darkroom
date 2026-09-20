# 本地版开发区

这里用于推进可实际上传照片并调用模型的本地 MVP，与现有评测实验台分开。

## 启动

在仓库根目录运行：

```bash
./develop/serve
```

然后打开 `http://127.0.0.1:4174/`。本地版复用评测台 `.env` 中的百炼配置，但 API Key 只在本地服务端读取，不发送到浏览器。

## 当前状态

- 工作名：`暗房`。这是界面占位名，不是最终品牌名。
- 当前阶段：本地 MVP 第一版实现与验证。
- 本地 MVP 规格：[specs/2026-08-24-local-mvp-design.md](specs/2026-08-24-local-mvp-design.md)
- 现有模型评测台：`experiments/ai-analysis-eval`
- 可复用的旧交互原型：分支 `feat/dynamic-frontend-prototype` 中的 `apps/web`

旧原型已经包含主页、分析输入页、结果页、分项评分条、裁切预览和参数建议。后续实施时应从该分支迁入并改造，不重写已经验证的基础交互，也不覆盖评测台。

## 目录边界

- `develop/app`：本地 MVP 业务代码。
- `develop/specs`：产品与交互规格。
- `experiments/ai-analysis-eval`：继续承担固定图片、提示词和模型回归评测。

评测台用于回答“模型是否可靠”；本地 MVP 用于回答“用户能否顺利上传自己的照片并得到可信点评”。两者不能合并成同一页面。
