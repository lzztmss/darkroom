# ADR 0004：模型供应商选择与图片传输方式

状态：已接受（本地 MVP）

## 背景

本地 MVP 需要在 DashScope/Qwen 与 DeepSeek Flash 之间切换，同时避免把 API Key、供应商 SDK 或模型名称硬编码到业务流程。DeepSeek 当前将视觉输入并入 `deepseek-flash`，旧的独立 vision 模型名已不再是首选。

## 决策

1. 通过环境变量选择供应商和模型：
   - `PHOTO_MENTOR_PROVIDER=dashscope|deepseek`
   - `PHOTO_MENTOR_API_KEY` 为通用 Key；也兼容 `DASHSCOPE_API_KEY` 和 `DEEPSEEK_API_KEY`。
   - `PHOTO_MENTOR_BASE_URL` 与 `PHOTO_MENTOR_MODEL` 可覆盖默认值。
2. 两个供应商都走统一的 OpenAI 兼容 Chat Completions 适配层，业务页面不直接绑定供应商 SDK。
3. DeepSeek Flash 的默认路径显式关闭 thinking，以避免视觉分析首轮因推理过程产生额外延迟；可通过 `PHOTO_MENTOR_ENABLE_THINKING=true` 选择更高延迟的路径。
4. 本地 MVP 继续使用压缩后的 Base64 data URL：当前上传图先缩放并压缩到约 0.9 MB，低于 DeepSeek 文档所述请求体限制，不需要公开图片地址。
5. 上线后只有在需要异步队列、重复分析、较大文件或降低请求体开销时，才引入对象存储短期签名 URL。原图继续留在私有存储，发送给模型的是独立的压缩预览；签名 URL 设置短过期时间、单次用途和自动清理，不把永久公开 URL 写入历史记录。

## 取舍与后续验证

- Base64 实现简单、不会额外暴露图片地址，适合当前本地 MVP；代价是每次请求都会携带图片字节。
- 外部 URL 可以减少重复传输并适合异步任务，但增加对象存储、签名、过期、访问日志和跨境/合规评估，不能仅因为“上线”就默认开启。
- 切换 DeepSeek 前，必须用固定评测集比较格式通过率、主观判断质量、延迟和费用，并完成照片数据位置与服务条款审阅。
