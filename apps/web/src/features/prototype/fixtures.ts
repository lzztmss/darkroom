import { CritiqueResultSchema } from './contracts';

export const prototypeCritique = CritiqueResultSchema.parse({
  id: 'railway-arizona-001',
  image: {
    src: '/images/railway-cars-arizona.jpg',
    alt: '停在亚利桑那旷野中的铁路车辆与向远处延伸的轨道',
    rights: '美国国家档案馆 · 公共领域',
  },
  intentSummary: '你想留下车辆停在旷野里的安静感，也喜欢轨道把视线带向远处。',
  photoDescription: [
    '三节铁路车辆停在开阔的荒地中，轨道从左下方进入画面并指向远处。',
    '车辆集中在画面左侧，右侧较大的空地让场景显得安静，也强调了距离。',
  ],
  overallScore: 82,
  scoreSummary: '这张照片已经建立了清晰的观看路径，空地与车辆之间的关系也服务了安静感。',
  dimensions: [
    { id: 'd1', key: 'composition', label: '构图', score: 86, title: '轨道形成观看路径', observation: '两条轨道从左下方进入并汇向车辆。', interpretation: '视线会自然停在车辆和远处空间之间。', action: '保留轨道入口，避免裁掉左下角的起点。', confidence: 0.92 },
    { id: 'd2', key: 'lighting', label: '光线', score: 78, title: '光线均匀但层次偏平', observation: '天空与地面的亮度接近，车辆侧面缺少明显明暗分离。', interpretation: '安静感成立，但空间层次稍弱。', action: '后期只轻压高光并抬一点局部对比。', confidence: 0.84 },
    { id: 'd3', key: 'color_tone', label: '色彩与影调', score: 81, title: '土色保持克制', observation: '车辆、土地和天空都处在低饱和暖灰范围。', interpretation: '色彩没有抢走场景的安静。', action: '保持低饱和，不需要额外增加鲜艳度。', confidence: 0.88 },
    { id: 'd4', key: 'narrative', label: '叙事', score: 88, title: '停驻与远方同时存在', observation: '静止车辆与延伸轨道形成停驻和离开的对照。', interpretation: '画面产生了含蓄的时间感。', action: '描述中保留这种对照，不必解释得过满。', confidence: 0.9 },
    { id: 'd5', key: 'technical', label: '技术质量', score: 74, title: '细节清楚但天空略薄', observation: '车辆细节可辨，天空的亮部层次较少。', interpretation: '不影响观看，但限制了最终质感。', action: '尝试高光 -12、对比 +6，再比较天空是否更完整。', confidence: 0.82 },
  ],
  strengths: [
    { id: 's1', title: '空地给安静留下了位置', observation: '右侧没有被其他主体填满。', interpretation: '留白让车辆显得停驻而不是拥挤。', action: '裁切时继续保留右侧空间。', confidence: 0.91 },
    { id: 's2', title: '轨道不是装饰，而是方向', observation: '轨道从近处连续通向车辆。', interpretation: '它把观看动作和画面主题连接起来。', action: '保持轨道入口可见。', confidence: 0.93 },
  ],
  improvements: [
    { id: 'i1', title: '天空可以再有一点层次', observation: '顶部亮度接近，没有明显云层细节。', interpretation: '大面积天空略显单薄。', action: '先尝试高光 -12；若变化很小就保持原样。', confidence: 0.78 },
  ],
  annotations: [
    { id: 'a1', layer: 'focus', kind: 'rect', box: { x: 0.14, y: 0.3, width: 0.36, height: 0.38 }, label: '主要视觉区域', confidence: 0.91, fallbackText: '车辆构成主要视觉区域。' },
    { id: 'a2', layer: 'composition', kind: 'line', x1: 0.02, y1: 0.94, x2: 0.47, y2: 0.56, label: '轨道引导线', confidence: 0.9, fallbackText: '轨道把视线从左下方引向车辆。' },
  ],
  cropCandidates: [
    { id: 'c1', label: '保守裁切', box: { x: 0.03, y: 0.05, width: 0.92, height: 0.9 }, aspectRatio: '4:3', reason: '轻收边缘，仍保留右侧空地。' },
    { id: 'c2', label: '明显重构', box: { x: 0.02, y: 0.16, width: 0.82, height: 0.7 }, aspectRatio: '3:2', reason: '减少天空，让轨道与车辆关系更直接。' },
  ],
  postProcessSuggestions: [
    { parameter: '高光', delta: -12, reason: '尝试找回天空层次。' },
    { parameter: '对比', delta: 6, reason: '轻微分开车辆与背景。' },
  ],
  nextShootSuggestions: [
    { id: 'n1', title: '可以多等一会儿侧光', action: '下次遇到类似开阔场景时，比较太阳更低时车辆侧面的变化。', reason: '侧光可能增加层次，但不是这张照片成立的前提。' },
  ],
  alternativeReading: '也可以把右侧空地理解为刻意的疏离，而不是需要被填满的区域。',
  confidence: 0.86,
});

export const historicalSlides = [
  { src: '/images/ansel-adams-tetons-snake-river.jpg', alt: 'The Tetons and Snake River', author: 'Ansel Adams', work: 'The Tetons and Snake River, 1942', rights: 'National Archives · Public Domain' },
  { src: '/images/ansel-adams-two-medicine-lake.jpg', alt: 'Two Medicine Lake', author: 'Ansel Adams', work: 'Two Medicine Lake, 1941–1942', rights: 'National Archives · Public Domain' },
  { src: '/images/railway-cars-arizona.jpg', alt: 'Railway cars in Arizona', author: 'Photographer unknown', work: 'Atlantic & Pacific Railway, c. 1890', rights: 'National Archives · Public Domain' },
] as const;
