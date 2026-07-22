# 竞品与可行性研究

日期：2026-07-22

## 竞品分组

### AI 摄影点评

- PhotoCritic：上传照片后按构图、光线、色彩、叙事和技术质量给出评分与文字建议。
- 国内与亚洲市场已有实时构图、五维评分和摄影教练类应用。

机会：提供中文语境、创作意图输入、图上证据、反传统构图解读、重拍位置模拟和长期成长记录，而不是只给总分与通用文字。

### AI 后期与个性化风格

- Lightroom：推荐与自适应预设。
- Imagen、Aftershoot：从职业摄影师历史编辑中学习风格。
- 参考图转 Lightroom 预设工具：从单张参考图生成 XMP。

机会：把后期放在摄影点评之后，先区分现场、拍摄和后期因素，再提供可解释、可控的传统参数。

### 相机配方

- Ricoh Recipes 等产品提供固定 JPEG 配方库。

机会：相机型号是参数约束，而不是产品核心；长期支持不同相机、RAW 和软件工作流。

### 摄影社区

- 500px、Flickr、Irys 及国内摄影社区提供作品展示、点赞和评论。

机会：从私密教练进入结构化互评，分离创作声望和点评声望，围绕学习过程而非单纯作品流建立关系。

## 技术可行性结论

现有视觉模型可以完成基础画面理解、结构化分析、裁切建议和中文解释。专业垂直深度需要组合：

- 视觉语言模型的语义与审美分析
- 主体、显著性、线条、遮挡和空间关系检测
- 摄影知识库与流派语境检索
- 结构化输出、证据锚定和置信度
- 用户反馈与固定专家评测集

研究已表明，现有模型对复杂摄影构图仍有明显限制，因此首版不能宣传为替代专业摄影师。

## 主要市场判断

需求存在，但单独“AI 打分”差异化较弱。更有价值的组合是：

> 私密点评 + 图上证据 + 重拍模拟 + 个性审美 + 可控传统后期 + 学习型社区

壁垒将来自合法获得的中文摄影反馈数据、点评体系、用户信任和社区质量，而不是基础模型本身。

## 参考来源

- [PhotoCritic](https://photocritic.ai/)
- [Adobe Lightroom 预设](https://helpx.adobe.com/lightroom/desktop/edit-photos/presets.html)
- [Aftershoot](https://aftershoot.com/)
- [Ricoh Recipes](https://ricohrecipes.com/ricoh-recipes-app/)
- [CVPR 2025：摄影构图理解数据集与基准](https://openaccess.thecvf.com/content/CVPR2025/html/Zhao_Can_Machines_Understand_Composition_Dataset_and_Benchmark_for_Photographic_Image_CVPR_2025_paper.html)
- [The Photographer Eye / PhotoCritique](https://arxiv.org/abs/2509.18582)
- [国家版权局关于规范摄影作品版权秩序的通知](https://www.ncac.gov.cn/xxfb/flfg/gfxwj/202006/t20200611_50562.html)
