# 中文摄影教练项目

一个面向中国摄影爱好者的私密 AI 摄影学习产品。它帮助用户理解照片、获得可执行的拍摄建议、尝试可控的传统后期，并逐步形成个人审美档案。

项目当前处于产品设计审阅阶段，尚未进入业务代码实现。

## 核心立场

- AI 是教练，不是摄影者。
- 默认不生成或替换真实画面内容。
- 建议必须可解释、可撤销并尽量锚定到原图证据。
- 摄影评价同时包含通用基础与用户个人创作目标。
- 用户照片默认私密；公开分享、训练使用和生成式模拟分别征得同意。
- 中国大陆版本优先使用已备案的国内模型服务，并保持供应商可替换。

## 文档导航

- [项目书](docs/product/PROJECT_BRIEF.md)
- [产品设计规格](docs/superpowers/specs/2026-07-22-photo-mentor-design.md)
- [产品路线图](docs/product/ROADMAP.md)
- [竞品与可行性研究](docs/research/COMPETITIVE_LANDSCAPE.md)
- [ADR-0001：国内模型与供应商抽象](docs/decisions/0001-domestic-model-provider-abstraction.md)
- [ADR-0002：隐私优先的照片生命周期](docs/decisions/0002-privacy-first-photo-lifecycle.md)
- [项目协作规则](AGENTS.md)

## 当前阶段出口

设计规格经项目发起人审阅确认后，下一步是编写实施计划；在此之前不确定技术栈、不搭建业务代码。
