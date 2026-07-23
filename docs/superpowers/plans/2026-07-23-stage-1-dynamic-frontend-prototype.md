# 固定样例动态前端原型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个不接真实账户、照片上传或模型调用的可点击动态前端，完整验证“主页—拍摄想法—分析状态—评分与证据—裁切/参数参考—建议反馈”流程是否清楚、可信并具有专业差异。

**Architecture:** 使用单个 Next.js App Router 应用；固定且经过许可的本地图片和 Zod 校验夹具是唯一数据源，浏览器内 React 状态负责轮播、表单、分析阶段、图层、裁切、参数预览与建议反馈。原型不发起业务 API 请求、不持久化用户输入、不模拟真实上传或真实 AI 百分比；组件边界与结构化契约保留给后续功能 MVP 接入。

**Tech Stack:** Node.js 24 LTS、pnpm 10、TypeScript 5.x、Next.js 16.x、React 19.x、Zod、Vitest、Testing Library、Playwright、ESLint、Prettier。

## Global Constraints

- 只使用已明确为公共领域或取得授权的本地样例照片；不得抓取摄影师作品、提交用户照片或引入远程图片链接。
- 原型不实现账户、真实文件上传、数据库、对象存储、模型调用、额度扣减、支付、公开社区或生成式图像。
- 必须显示百分制总分和构图、光线、色彩与影调、叙事、技术质量五个分项；数字必须同时有照片证据、解释与建议。
- 分数颜色规则固定为：85分及以上灰绿色，75至84分暖灰金色，75分以下低饱和砖红色；颜色不得成为唯一信息。
- 点评顺序固定为画面描述、画面亮点、可以再试试；肯定必须具体，改进必须尊重且可执行。
- “下次遇到类似场景”只提供参考，不要求用户重拍、修改照片、上传对比版本或证明执行。
- 图层、裁切与参数仅改变浏览器预览状态，不覆盖样例图像原始像素。
- 分析状态在上传页原地完成；按钮按阶段填充但不显示伪造的精确百分比。
- 原型额度文字只作视觉预留，不减少次数、不锁定内容、不出现真实支付入口。
- 中文移动端优先；键盘可操作、图片有替代文本、动态状态通过文本与 ARIA 同时表达。
- 每项功能先写失败测试；每个任务结束时运行相应测试、类型检查和静态检查。

---

## 文件结构

| 路径 | 职责 |
| --- | --- |
| `package.json`、`pnpm-workspace.yaml` | 根工作区与统一脚本 |
| `apps/web/package.json`、`apps/web/tsconfig.json` | Web 应用依赖与严格 TypeScript 配置 |
| `apps/web/src/app/` | `/`、`/analyze`、`/result` 路由、布局和全局样式 |
| `apps/web/public/images/` | 本地公共领域样例图片 |
| `apps/web/public/THIRD_PARTY_ASSETS.md` | 图片来源、作者、年代和权利状态 |
| `apps/web/src/features/prototype/contracts.ts` | Zod schema、共享类型和评分色阶 |
| `apps/web/src/features/prototype/fixtures.ts` | 单一结构化分析样例与首页作品清单 |
| `apps/web/src/features/home/` | 接触印样横向轮播 |
| `apps/web/src/features/analyze/` | 样例照片、想法表单与阶段进度 |
| `apps/web/src/features/result/` | 分数、描述、亮点、改进与结果布局 |
| `apps/web/src/features/evidence/` | 重点、构图和裁切图层 |
| `apps/web/src/features/tools/` | 裁切预览、参数预览和下次拍摄参考 |
| `apps/web/src/features/feedback/` | 仅在内存保存的建议反馈 |
| `apps/web/src/test/`、`apps/web/e2e/` | 单元、组件与关键流程测试 |
| `docs/research/prototype-usability-script.md` | 5人无讲解可用性测试协议 |

### Task 1: 建立可测试工作区、设计令牌与本地图片

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/eslint.config.mjs`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/page.test.tsx`
- Create: `apps/web/public/images/ansel-adams-tetons-snake-river.jpg`
- Create: `apps/web/public/images/ansel-adams-two-medicine-lake.jpg`
- Create: `apps/web/public/images/railway-cars-arizona.jpg`
- Create: `apps/web/public/THIRD_PARTY_ASSETS.md`

**Interfaces:**

- Produces: `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm e2e`.
- Produces: CSS variables `--ink`, `--panel`, `--paper`, `--muted`, `--line`, `--rust`, `--score-high`, `--score-mid`, `--score-low`.
- Consumes: three existing local public-domain files under `.superpowers/brainstorm/98280-1784787298/content/`.

- [ ] **Step 1: Write the failing application-shell test**

```tsx
import { render, screen } from '@testing-library/react';
import HomePage from './page';

it('presents a private fixed-sample prototype without a product name assumption', () => {
  render(<HomePage />);
  expect(screen.getByRole('heading', { name: '把照片放进来。我们一起看。' })).toBeVisible();
  expect(screen.getByText('只给你看，不公开。')).toBeVisible();
  expect(screen.getByText('固定样例原型')).toBeVisible();
});
```

- [ ] **Step 2: Run the test and verify the workspace is absent**

Run: `pnpm --filter @photo-mentor/web test src/app/page.test.tsx`

Expected: FAIL because `package.json` or `apps/web/src/app/page.test.tsx` does not exist.

- [ ] **Step 3: Add the exact workspace configuration**

```json
{
  "name": "photo-mentor-cn",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "pnpm --filter @photo-mentor/web dev",
    "test": "pnpm --filter @photo-mentor/web test",
    "typecheck": "pnpm --filter @photo-mentor/web typecheck",
    "lint": "pnpm --filter @photo-mentor/web lint",
    "e2e": "pnpm --filter @photo-mentor/web e2e"
  }
}
```

```yaml
packages:
  - apps/*
```

```json
{
  "name": "@photo-mentor/web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "e2e": "playwright test"
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.0.0",
    "jsdom": "^26.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.9.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

Configure Vitest with `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, and strict TypeScript with `noUncheckedIndexedAccess: true`.

- [ ] **Step 4: Add the minimal shell and design tokens**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '私人摄影教练',
  description: '固定样例动态前端原型',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

```css
:root {
  --ink: #080807;
  --panel: #0f0f0d;
  --paper: #e7e1d7;
  --muted: #8f8a82;
  --line: rgba(231, 225, 215, 0.14);
  --rust: #9f4635;
  --score-high: #6f806d;
  --score-mid: #a58b62;
  --score-low: #98584f;
  color-scheme: dark;
}

* { box-sizing: border-box; }
html { background: var(--ink); }
body {
  margin: 0;
  background: var(--ink);
  color: var(--paper);
  font-family: "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", Arial, sans-serif;
}
button, textarea { font: inherit; }
button:focus-visible, a:focus-visible, textarea:focus-visible {
  outline: 1px solid var(--paper);
  outline-offset: 3px;
}
```

```tsx
export default function HomePage() {
  return (
    <main>
      <p>固定样例原型</p>
      <h1>把照片放进来。我们一起看。</h1>
      <p>只给你看，不公开。</p>
    </main>
  );
}
```

- [ ] **Step 5: Copy and document the local public-domain assets**

Run:

```bash
mkdir -p apps/web/public/images
cp .superpowers/brainstorm/98280-1784787298/content/ansel-adams-tetons-snake-river.jpg apps/web/public/images/
cp .superpowers/brainstorm/98280-1784787298/content/ansel-adams-two-medicine-lake.jpg apps/web/public/images/
cp .superpowers/brainstorm/98280-1784787298/content/railway-cars-arizona.jpg apps/web/public/images/
```

Write `apps/web/public/THIRD_PARTY_ASSETS.md` with these three entries:

```markdown
# Prototype image assets

- `ansel-adams-tetons-snake-river.jpg` — Ansel Adams, *The Tetons and Snake River*, 1942; U.S. National Archives; Public Domain.
- `ansel-adams-two-medicine-lake.jpg` — Ansel Adams, *Two Medicine Lake, Glacier National Park*, 1941–1942; U.S. National Archives; Public Domain.
- `railway-cars-arizona.jpg` — Photographer unknown, *Atlantic & Pacific Railway, Arizona*, c. 1890; U.S. National Archives; Public Domain.

These files are fixed prototype samples. They are not user uploads and must not be used as model-training consent examples.
```

- [ ] **Step 6: Install and verify the baseline**

Run: `pnpm install && pnpm test && pnpm typecheck && pnpm lint`

Expected: installation succeeds; the shell test passes; typecheck and lint exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml apps/web
git commit -m "chore: scaffold dynamic photography prototype"
```

### Task 2: 固化百分制分析契约与固定夹具

**Files:**

- Create: `apps/web/src/features/prototype/contracts.ts`
- Create: `apps/web/src/features/prototype/fixtures.ts`
- Create: `apps/web/src/features/prototype/contracts.test.ts`

**Interfaces:**

- Produces: `CritiqueResult`, `Annotation`, `CropCandidate`, `FeedbackChoice`, `Genre`, `scoreTone(score)`.
- Produces: `prototypeCritique` and `historicalSlides`.
- Consumes: only local public image paths; normalized coordinates use `0..1`.

- [ ] **Step 1: Write failing contract tests**

```ts
import { CritiqueResultSchema, scoreTone } from './contracts';
import { prototypeCritique } from './fixtures';

it('accepts one total score and exactly five scored dimensions', () => {
  const result = CritiqueResultSchema.parse(prototypeCritique);
  expect(result.overallScore).toBe(82);
  expect(result.dimensions).toHaveLength(5);
  expect(result.dimensions.map(({ key }) => key)).toEqual([
    'composition',
    'lighting',
    'color_tone',
    'narrative',
    'technical',
  ]);
});

it('rejects scores outside 0 through 100', () => {
  const result = CritiqueResultSchema.safeParse({ ...prototypeCritique, overallScore: 101 });
  expect(result.success).toBe(false);
});

it('rejects reshoot versions because feedback never requires a comparison upload', () => {
  const result = CritiqueResultSchema.safeParse({
    ...prototypeCritique,
    reshootVersions: [{ imageUrl: '/images/after.jpg' }],
  });
  expect(result.success).toBe(false);
});

it.each([
  [85, 'high'],
  [84, 'mid'],
  [75, 'mid'],
  [74, 'low'],
])('maps %i to the restrained score tone %s', (score, tone) => {
  expect(scoreTone(score)).toBe(tone);
});
```

- [ ] **Step 2: Run the contract test**

Run: `pnpm --filter @photo-mentor/web test src/features/prototype/contracts.test.ts`

Expected: FAIL because the schema and fixtures do not exist.

- [ ] **Step 3: Implement strict schemas and exported types**

```ts
import { z } from 'zod';

export const GenreSchema = z.enum(['documentary', 'street', 'portrait', 'landscape', 'urban', 'uncertain']);
export type Genre = z.infer<typeof GenreSchema>;

const ScoreSchema = z.number().int().min(0).max(100);
const ConfidenceSchema = z.number().min(0).max(1);

export const NormalizedBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
}).refine(({ x, width }) => x + width <= 1)
  .refine(({ y, height }) => y + height <= 1);

export const AdviceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  observation: z.string().min(1),
  interpretation: z.string().min(1),
  action: z.string().min(1),
  confidence: ConfidenceSchema,
});

export const DimensionAssessmentSchema = AdviceSchema.extend({
  key: z.enum(['composition', 'lighting', 'color_tone', 'narrative', 'technical']),
  label: z.enum(['构图', '光线', '色彩与影调', '叙事', '技术质量']),
  score: ScoreSchema,
});

export const AnnotationSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string(),
    layer: z.enum(['focus', 'composition']),
    kind: z.literal('rect'),
    box: NormalizedBoxSchema,
    label: z.string(),
    confidence: ConfidenceSchema,
    fallbackText: z.string(),
  }),
  z.object({
    id: z.string(),
    layer: z.literal('composition'),
    kind: z.literal('line'),
    x1: z.number().min(0).max(1),
    y1: z.number().min(0).max(1),
    x2: z.number().min(0).max(1),
    y2: z.number().min(0).max(1),
    label: z.string(),
    confidence: ConfidenceSchema,
    fallbackText: z.string(),
  }),
]);

export const CropCandidateSchema = z.object({
  id: z.string(),
  label: z.enum(['保守裁切', '明显重构']),
  box: NormalizedBoxSchema,
  aspectRatio: z.string(),
  reason: z.string(),
});

export const CritiqueResultSchema = z.object({
  id: z.string(),
  image: z.object({ src: z.string(), alt: z.string(), rights: z.string() }),
  intentSummary: z.string(),
  photoDescription: z.array(z.string().min(1)).min(2).max(4),
  overallScore: ScoreSchema,
  scoreSummary: z.string(),
  dimensions: z.array(DimensionAssessmentSchema).length(5),
  strengths: z.array(AdviceSchema).min(1).max(3),
  improvements: z.array(AdviceSchema).min(1).max(3),
  annotations: z.array(AnnotationSchema),
  cropCandidates: z.array(CropCandidateSchema).max(2),
  postProcessSuggestions: z.array(z.object({
    parameter: z.enum(['曝光', '白平衡', '对比', '高光', '阴影', '饱和度', '黑白']),
    delta: z.number().min(-100).max(100),
    reason: z.string(),
  })).max(6),
  nextShootSuggestions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    action: z.string(),
    reason: z.string(),
  })).max(3),
  alternativeReading: z.string(),
  confidence: ConfidenceSchema,
}).strict().superRefine(({ dimensions }, context) => {
  if (new Set(dimensions.map(({ key }) => key)).size !== 5) {
    context.addIssue({ code: 'custom', message: 'five score dimensions must be unique', path: ['dimensions'] });
  }
});

export const FeedbackChoiceSchema = z.enum(['accurate', 'helpful', 'misunderstood', 'not_applicable']);
export type CritiqueResult = z.infer<typeof CritiqueResultSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type CropCandidate = z.infer<typeof CropCandidateSchema>;
export type FeedbackChoice = z.infer<typeof FeedbackChoiceSchema>;

export function scoreTone(score: number): 'high' | 'mid' | 'low' {
  if (score >= 85) return 'high';
  if (score >= 75) return 'mid';
  return 'low';
}
```

- [ ] **Step 4: Add one complete validated critique fixture**

Create `prototypeCritique` with:

```ts
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
```

- [ ] **Step 5: Verify schemas and fixtures**

Run: `pnpm --filter @photo-mentor/web test src/features/prototype/contracts.test.ts && pnpm typecheck`

Expected: all four contract tests pass and typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/prototype
git commit -m "feat: define scored critique prototype contract"
```

### Task 3: 实现接触印样主页与横向轮播

**Files:**

- Create: `apps/web/src/features/home/ContactSheetCarousel.tsx`
- Create: `apps/web/src/features/home/ContactSheetCarousel.test.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**

- Consumes: `historicalSlides`.
- Produces: accessible previous/next controls, `01 / 03` counter and `/analyze` primary link.
- Visual reference: `.superpowers/brainstorm/98280-1784787298/content/homepage-contact-carousel-v4.html`.

- [ ] **Step 1: Write the failing carousel test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { historicalSlides } from '../prototype/fixtures';
import { ContactSheetCarousel } from './ContactSheetCarousel';

it('moves through three local historical photographs', async () => {
  const user = userEvent.setup();
  render(<ContactSheetCarousel slides={historicalSlides} />);
  expect(screen.getByText('01 / 03')).toBeVisible();
  expect(screen.getByRole('img', { name: 'The Tetons and Snake River' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: '下一张' }));
  expect(screen.getByText('02 / 03')).toBeVisible();
  expect(screen.getByRole('img', { name: 'Two Medicine Lake' })).toBeVisible();
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @photo-mentor/web test src/features/home/ContactSheetCarousel.test.tsx`

Expected: FAIL because `ContactSheetCarousel` is missing.

- [ ] **Step 3: Implement the client-side carousel**

```tsx
'use client';

import { useState } from 'react';

type Slide = {
  src: string;
  alt: string;
  author: string;
  work: string;
  rights: string;
};

export function ContactSheetCarousel({ slides }: { slides: readonly Slide[] }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  if (!slide) return null;
  const move = (delta: number) => setIndex((current) => (current + delta + slides.length) % slides.length);

  return (
    <section aria-label="摄影史作品接触印样" className="contact-sheet">
      <figure>
        <img src={slide.src} alt={slide.alt} />
        <figcaption>
          <span><strong>{slide.author}</strong>{slide.work}</span>
          <span>{slide.rights}</span>
        </figcaption>
      </figure>
      <div className="carousel-controls">
        <button type="button" aria-label="上一张" onClick={() => move(-1)}>←</button>
        <span aria-live="polite">{String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
        <button type="button" aria-label="下一张" onClick={() => move(1)}>→</button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Compose the homepage**

```tsx
import Link from 'next/link';
import { ContactSheetCarousel } from '../features/home/ContactSheetCarousel';
import { historicalSlides } from '../features/prototype/fixtures';

export default function HomePage() {
  return (
    <main className="home-page">
      <header><span>私人摄影教练</span><span>固定样例原型</span></header>
      <section className="home-hero">
        <div>
          <p>先从一张照片开始。</p>
          <h1>把照片放进来。<br />我们一起看。</h1>
          <p>哪里拍得好，哪里还能更好，我们会直接告诉你。</p>
          <Link href="/analyze">开始看一张照片</Link>
          <p>只给你看，不公开。</p>
          <blockquote>“相机会教人如何看见。”</blockquote>
          <cite>— 多萝西娅·兰格</cite>
        </div>
        <ContactSheetCarousel slides={historicalSlides} />
      </section>
    </main>
  );
}
```

Port only the layout, spacing and restrained darkroom palette from the visual reference. Do not copy its inline JavaScript or introduce remote fonts/images.

- [ ] **Step 5: Verify homepage behavior**

Run: `pnpm --filter @photo-mentor/web test src/features/home/ContactSheetCarousel.test.tsx src/app/page.test.tsx && pnpm typecheck && pnpm lint`

Expected: carousel and shell tests pass; typecheck and lint exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/home apps/web/src/app/page.tsx apps/web/src/app/globals.css
git commit -m "feat: add contact sheet landing page"
```

### Task 4: 实现拍摄想法表单与按钮填充分析状态

**Files:**

- Create: `apps/web/src/features/analyze/AnalyzeForm.tsx`
- Create: `apps/web/src/features/analyze/AnalysisProgressButton.tsx`
- Create: `apps/web/src/features/analyze/AnalyzeFlow.test.tsx`
- Create: `apps/web/src/app/analyze/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**

- Produces: `PrototypeContext = { intent: string; genre: Genre | null }`.
- Produces: stages `idle | reading | composition | writing | complete | failed`.
- Consumes: fixed sample image only; on completion navigates to `/result`.
- Visual reference: `.superpowers/brainstorm/98280-1784787298/content/upload-single-page-v6.html`.

- [ ] **Step 1: Write failing form and progress tests**

```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AnalyzeForm } from './AnalyzeForm';
import { AnalysisProgressButton } from './AnalysisProgressButton';

it('allows intent and genre to remain empty', async () => {
  const user = userEvent.setup();
  const onContext = vi.fn();
  render(<AnalyzeForm onContext={onContext} onComplete={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: '开始分析' }));
  expect(onContext).toHaveBeenCalledWith({ intent: '', genre: null });
  expect(screen.getByText('完整点评体验 3 次 · 今日基础分析 1 次')).toBeVisible();
});

it('fills the same button through named stages without showing a numeric percent', async () => {
  vi.useFakeTimers();
  const onComplete = vi.fn();
  render(<AnalysisProgressButton started onComplete={onComplete} />);
  expect(screen.getByRole('button', { name: '正在读照片…' })).toBeDisabled();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  await act(async () => vi.advanceTimersByTime(1800));
  expect(onComplete).toHaveBeenCalledOnce();
  vi.useRealTimers();
});

it('offers a retry after a simulated failure without consuming quota', async () => {
  vi.useFakeTimers();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const onComplete = vi.fn();
  render(<AnalysisProgressButton started shouldFail onComplete={onComplete} />);
  await act(async () => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('alert')).toHaveTextContent('未消耗任何额度');
  await user.click(screen.getByRole('button', { name: '重新分析' }));
  await act(async () => vi.advanceTimersByTime(1800));
  expect(onComplete).toHaveBeenCalledOnce();
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run the tests**

Run: `pnpm --filter @photo-mentor/web test src/features/analyze`

Expected: FAIL because the analyze components do not exist.

- [ ] **Step 3: Implement deterministic prototype stages**

```tsx
'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

const stages = [
  { key: 'reading', label: '正在读照片…', fill: 22 },
  { key: 'composition', label: '正在看构图与光线…', fill: 58 },
  { key: 'writing', label: '正在整理建议…', fill: 86 },
  { key: 'complete', label: '分析完成', fill: 100 },
] as const;

export function AnalysisProgressButton({
  started,
  onComplete,
  shouldFail = false,
}: {
  started: boolean;
  onComplete: () => void;
  shouldFail?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [hasFailed, setHasFailed] = useState(false);
  const failed = shouldFail && !hasFailed && index === 2;
  const current = stages[index];

  useEffect(() => {
    if (!started || failed) return;
    if (index === stages.length - 1) {
      const timer = window.setTimeout(onComplete, 300);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setIndex((value) => value + 1), 500);
    return () => window.clearTimeout(timer);
  }, [failed, index, onComplete, started]);

  if (failed) {
    return (
      <div>
        <p role="alert">这次没有分析成功，未消耗任何额度。</p>
        <button type="button" onClick={() => { setHasFailed(true); setIndex(0); }}>重新分析</button>
      </div>
    );
  }

  return (
    <button
      type="submit"
      className="analysis-progress"
      style={{ '--fill': `${started ? current.fill : 0}%` } as CSSProperties}
      disabled={started}
      aria-label={started ? current.label : '开始分析'}
    >
      <span>{started ? current.label : '开始分析'}</span>
    </button>
  );
}
```

The fill is a `::before` layer using `width: var(--fill)`, `background: rgba(159, 70, 53, .24)`, and `z-index: 0`; the label uses `position: relative; z-index: 1`.

- [ ] **Step 4: Implement the optional context form and fixed sample state**

```tsx
'use client';

import { useState } from 'react';
import type { Genre } from '../prototype/contracts';
import { AnalysisProgressButton } from './AnalysisProgressButton';

const genres: Array<[Genre, string]> = [
  ['documentary', '纪实'],
  ['street', '街头'],
  ['portrait', '人像'],
  ['landscape', '风光'],
  ['urban', '城市空间'],
  ['uncertain', '不确定'],
];

export type PrototypeContext = { intent: string; genre: Genre | null };

export function AnalyzeForm({
  onContext,
  onComplete,
}: {
  onContext: (context: PrototypeContext) => void;
  onComplete: () => void;
}) {
  const [intent, setIntent] = useState('');
  const [genre, setGenre] = useState<Genre | null>(null);
  const [started, setStarted] = useState(false);
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      if (started) return;
      onContext({ intent, genre });
      setStarted(true);
    }}>
      <label htmlFor="intent">拍摄想法 <span>选填 · 最多 200 字</span></label>
      <textarea id="intent" maxLength={200} value={intent} disabled={started} onChange={(event) => setIntent(event.target.value)} />
      <fieldset disabled={started}>
        <legend>大致类型 <span>选填</span></legend>
        {genres.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={genre === value} onClick={() => setGenre(genre === value ? null : value)}>{label}</button>
        ))}
      </fieldset>
      <p>完整点评体验 3 次 · 今日基础分析 1 次</p>
      <AnalysisProgressButton started={started} onComplete={onComplete} />
    </form>
  );
}
```

`/analyze` renders the fixed railway photo, a “移除/使用示例照片” toggle, privacy copy, and `AnalyzeForm`. Pass `onContext={() => undefined}` because the fixed result does not need persisted input, and pass `onComplete={() => router.push('/result')}`. While `started` is true the form controls are disabled and visually subdued. The quota line never changes.

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnalyzeForm } from '../../features/analyze/AnalyzeForm';

export default function AnalyzePage() {
  const router = useRouter();
  const [showSample, setShowSample] = useState(true);
  return (
    <main>
      <section>
        <div>
          {showSample ? <img src="/images/railway-cars-arizona.jpg" alt="待分析的铁路车辆固定样例" /> : <p>当前没有样例照片</p>}
          <button type="button" onClick={() => setShowSample((value) => !value)}>{showSample ? '移除' : '使用示例照片'}</button>
          <p>默认私密 · 固定样例不会上传 · 不保留精确位置</p>
        </div>
        <AnalyzeForm onContext={() => undefined} onComplete={() => router.push('/result')} />
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Verify normal and failure states**

Run: `pnpm --filter @photo-mentor/web test src/features/analyze && pnpm typecheck && pnpm lint`

Expected: optional form, stage text, nonnumeric progress, retry text and unchanged quota tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/analyze apps/web/src/app/analyze apps/web/src/app/globals.css
git commit -m "feat: add dynamic fixed-sample analysis flow"
```

### Task 5: 渲染总分、五项分数与有情绪价值的点评

**Files:**

- Create: `apps/web/src/features/result/ScoreSummary.tsx`
- Create: `apps/web/src/features/result/CritiqueSections.tsx`
- Create: `apps/web/src/features/result/ResultPage.tsx`
- Create: `apps/web/src/features/result/ResultPage.test.tsx`
- Create: `apps/web/src/app/result/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**

- Consumes: `CritiqueResult`.
- Produces: total score, five dimension bars, description, strengths, improvements, alternative reading and confidence.
- Visual reference: `.superpowers/brainstorm/98280-1784787298/content/analysis-workbench-v2.html`.

- [ ] **Step 1: Write failing score and copy tests**

```tsx
import { render, screen } from '@testing-library/react';
import { prototypeCritique } from '../prototype/fixtures';
import { ScoreSummary } from './ScoreSummary';
import { CritiqueSections } from './CritiqueSections';

it('renders a total score and five individually labelled scores', () => {
  render(<ScoreSummary result={prototypeCritique} />);
  expect(screen.getByText('82')).toBeVisible();
  expect(screen.getAllByTestId('dimension-score')).toHaveLength(5);
  expect(screen.getByTestId('score-composition')).toHaveAttribute('data-tone', 'high');
  expect(screen.getByTestId('score-lighting')).toHaveAttribute('data-tone', 'mid');
  expect(screen.getByTestId('score-technical')).toHaveAttribute('data-tone', 'low');
});

it('describes the specific photograph before strengths and improvements', () => {
  render(<CritiqueSections result={prototypeCritique} />);
  const headings = screen.getAllByRole('heading').map((heading) => heading.textContent);
  expect(headings).toEqual(expect.arrayContaining(['关于这张照片', '画面亮点', '可以再试试']));
  expect(screen.getByText(/三节铁路车辆停在开阔的荒地中/)).toBeVisible();
  expect(screen.getByText(/空地给安静留下了位置/)).toBeVisible();
});
```

- [ ] **Step 2: Run the tests**

Run: `pnpm --filter @photo-mentor/web test src/features/result`

Expected: FAIL because result components are missing.

- [ ] **Step 3: Implement score presentation with text and tone**

```tsx
import { scoreTone, type CritiqueResult } from '../prototype/contracts';

export function ScoreSummary({ result }: { result: CritiqueResult }) {
  return (
    <section aria-labelledby="score-heading">
      <div>
        <h1 id="score-heading">{result.scoreSummary}</h1>
        <p><strong>{result.overallScore}</strong><span> / 100</span></p>
      </div>
      <div>
        {result.dimensions.map((dimension) => {
          const tone = scoreTone(dimension.score);
          const range = tone === 'high' ? '85分以上' : tone === 'mid' ? '75至84分' : '75分以下';
          return (
            <div key={dimension.key} data-testid={`score-${dimension.key}`} data-tone={tone}>
              <div data-testid="dimension-score">
                <span>{dimension.label}</span>
                <strong aria-label={`${dimension.label}${dimension.score}分，${range}`}>{dimension.score}</strong>
              </div>
              <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dimension.score} aria-label={`${dimension.label}评分`}>
                <span style={{ width: `${dimension.score}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement description, strengths and respectful improvements**

```tsx
import type { CritiqueResult } from '../prototype/contracts';

export function CritiqueSections({ result }: { result: CritiqueResult }) {
  return (
    <div>
      <section><h2>关于这张照片</h2>{result.photoDescription.map((line) => <p key={line}>{line}</p>)}</section>
      <section><h2>画面亮点</h2>{result.strengths.map((item) => <article key={item.id}><h3>{item.title}</h3><p>{item.observation}</p><p>{item.interpretation}</p></article>)}</section>
      <section><h2>可以再试试</h2>{result.improvements.map((item) => <article key={item.id}><h3>{item.title}</h3><p>{item.observation}</p><p>{item.action}</p></article>)}</section>
      <details><summary>另一种合理解读</summary><p>{result.alternativeReading}</p><p>整体判断置信度 {Math.round(result.confidence * 100)}%</p></details>
    </div>
  );
}
```

Compose `ResultPage` as a smaller left photo workspace and a wider readable right column. Do not render “综合参考” or negative grade labels.

- [ ] **Step 5: Verify result rendering**

Run: `pnpm --filter @photo-mentor/web test src/features/result && pnpm typecheck && pnpm lint`

Expected: score thresholds, five dimensions and photo-specific copy tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/result apps/web/src/app/result apps/web/src/app/globals.css
git commit -m "feat: render scored evidence based critique"
```

### Task 6: 实现重点、构图和裁切图层

**Files:**

- Create: `apps/web/src/features/evidence/PhotoEvidenceViewer.tsx`
- Create: `apps/web/src/features/evidence/AnnotationLayer.tsx`
- Create: `apps/web/src/features/evidence/PhotoEvidenceViewer.test.tsx`
- Modify: `apps/web/src/features/result/ResultPage.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**

- Consumes: `CritiqueResult.image`, `Annotation[]`, `CropCandidate[]`.
- Produces: modes `focus | composition | crop`, selected through `aria-pressed` buttons.
- Geometry renders only when `confidence >= 0.7`; otherwise a text fallback appears.

- [ ] **Step 1: Write failing layer tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { prototypeCritique } from '../prototype/fixtures';
import { AnnotationLayer } from './AnnotationLayer';
import { PhotoEvidenceViewer } from './PhotoEvidenceViewer';

it('switches from focus evidence to composition evidence', async () => {
  const user = userEvent.setup();
  render(<PhotoEvidenceViewer result={prototypeCritique} />);
  expect(screen.getByText('主要视觉区域')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '构图' }));
  expect(screen.getByText('轨道引导线')).toBeVisible();
});

it('uses fallback text instead of low-confidence geometry', () => {
  const lowConfidence = {
    ...prototypeCritique.annotations[0],
    id: 'low',
    confidence: 0.4,
    fallbackText: '这个区域只能作为一种可能理解。',
  };
  render(<AnnotationLayer annotations={[lowConfidence]} layer="focus" />);
  expect(screen.queryByTestId('annotation-shape')).not.toBeInTheDocument();
  expect(screen.getByText('这个区域只能作为一种可能理解。')).toBeVisible();
});
```

- [ ] **Step 2: Run the tests**

Run: `pnpm --filter @photo-mentor/web test src/features/evidence`

Expected: FAIL because evidence components are missing.

- [ ] **Step 3: Implement SVG annotations as a separate layer**

```tsx
import type { Annotation } from '../prototype/contracts';

export function AnnotationLayer({ annotations, layer }: { annotations: Annotation[]; layer: 'focus' | 'composition' }) {
  const visible = annotations.filter((annotation) => annotation.layer === layer);
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {visible.filter(({ confidence }) => confidence >= 0.7).map((annotation) =>
          annotation.kind === 'rect' ? (
            <rect key={annotation.id} data-testid="annotation-shape" x={annotation.box.x * 100} y={annotation.box.y * 100} width={annotation.box.width * 100} height={annotation.box.height * 100} />
          ) : (
            <line key={annotation.id} data-testid="annotation-shape" x1={annotation.x1 * 100} y1={annotation.y1 * 100} x2={annotation.x2 * 100} y2={annotation.y2 * 100} />
          ),
        )}
      </svg>
      {visible.map((annotation) => annotation.confidence >= 0.7 ? <span key={annotation.id}>{annotation.label}</span> : <p key={annotation.id}>{annotation.fallbackText}</p>)}
    </>
  );
}
```

- [ ] **Step 4: Implement the three-mode viewer**

`PhotoEvidenceViewer` keeps `mode` in local state, renders the original `<img>` once, overlays `AnnotationLayer` for focus/composition, and overlays `cropCandidates[0].box` for crop. Buttons use `aria-pressed`; the caption always states “图层与裁切不会修改原图”.

- [ ] **Step 5: Verify overlays and layout**

Run: `pnpm --filter @photo-mentor/web test src/features/evidence && pnpm typecheck && pnpm lint`

Expected: layer switching and confidence fallback tests pass; typecheck and lint exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/evidence apps/web/src/features/result/ResultPage.tsx apps/web/src/app/globals.css
git commit -m "feat: add interactive photo evidence layers"
```

### Task 7: 实现裁切、参数预览与下一次拍摄参考

**Files:**

- Create: `apps/web/src/features/tools/CropPreview.tsx`
- Create: `apps/web/src/features/tools/ParameterPreview.tsx`
- Create: `apps/web/src/features/tools/NextShootReference.tsx`
- Create: `apps/web/src/features/tools/ResultTools.tsx`
- Create: `apps/web/src/features/tools/ResultTools.test.tsx`
- Modify: `apps/web/src/features/result/ResultPage.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**

- Consumes: `CropCandidate[]`, `postProcessSuggestions`, `nextShootSuggestions`.
- Produces: bounded local crop box, resettable CSS-only parameter preview and read-only future reference.
- Does not produce: image file, upload control, modified-photo record or comparison version.

- [ ] **Step 1: Write failing tool tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { prototypeCritique } from '../prototype/fixtures';
import { CropPreview } from './CropPreview';
import { NextShootReference } from './NextShootReference';
import { ParameterPreview } from './ParameterPreview';

it('keeps a nudged crop inside the source image', async () => {
  const user = userEvent.setup();
  render(<CropPreview candidates={prototypeCritique.cropCandidates} />);
  for (let count = 0; count < 20; count += 1) {
    await user.click(screen.getByRole('button', { name: '向右移动裁切框' }));
  }
  expect(screen.getByTestId('crop-frame')).toHaveAttribute('data-within-source', 'true');
  expect(screen.getByText('原图没有被修改')).toBeVisible();
});

it('resets an illustrative parameter preview', async () => {
  const user = userEvent.setup();
  render(<ParameterPreview image={prototypeCritique.image} suggestions={prototypeCritique.postProcessSuggestions} />);
  await user.click(screen.getByRole('button', { name: '应用建议参数' }));
  expect(screen.getByTestId('parameter-preview')).toHaveAttribute('data-adjusted', 'true');
  await user.click(screen.getByRole('button', { name: '恢复原图预览' }));
  expect(screen.getByTestId('parameter-preview')).toHaveAttribute('data-adjusted', 'false');
});

it('presents future shooting advice without asking for a reshoot upload', () => {
  render(<NextShootReference suggestions={prototypeCritique.nextShootSuggestions} />);
  expect(screen.getByText('下次遇到类似场景')).toBeVisible();
  expect(screen.queryByRole('button', { name: /上传|提交重拍/ })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests**

Run: `pnpm --filter @photo-mentor/web test src/features/tools`

Expected: FAIL because the tool components are missing.

- [ ] **Step 3: Implement bounded crop calculations**

```ts
import type { CropCandidate } from '../prototype/contracts';

export function clampCrop(box: CropCandidate['box']): CropCandidate['box'] {
  const width = Math.min(box.width, 1);
  const height = Math.min(box.height, 1);
  return {
    width,
    height,
    x: Math.min(Math.max(box.x, 0), 1 - width),
    y: Math.min(Math.max(box.y, 0), 1 - height),
  };
}
```

`CropPreview` offers “保守裁切/明显重构”, four 0.01 nudge controls and reset. It displays aspect ratio, reason, calculated loss `Math.round((1 - width * height) * 100)` and “原图没有被修改”.

- [ ] **Step 4: Implement a CSS-only parameter preview**

`ParameterPreview` initializes with `data-adjusted="false"` and no inline filter. “应用建议参数” changes it to `data-adjusted="true"`, maps contrast delta `6` to `contrast(1.06)` and high-light guidance to a restrained `brightness(0.98)` demonstration; “恢复原图预览” clears the filter and restores `data-adjusted="false"`. The panel labels this as a direction preview, not a promised Lightroom value or exported edit.

- [ ] **Step 5: Implement the read-only future reference and tool panel**

`NextShootReference` renders `title`, `action`, and `reason`, followed by “这只是下次遇到类似场景时的参考，不需要重拍或提交反馈照片。” `ResultTools` exposes three buttons: “尝试裁切”“参数建议”“下次拍摄参考”, with only one panel expanded at a time.

- [ ] **Step 6: Verify tool interactions**

Run: `pnpm --filter @photo-mentor/web test src/features/tools && pnpm typecheck && pnpm lint`

Expected: crop bounds, parameter reset and no-reshoot-upload tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/tools apps/web/src/features/result/ResultPage.tsx apps/web/src/app/globals.css
git commit -m "feat: add crop and adjustment reference tools"
```

### Task 8: 实现建议反馈并贯通端到端动态流程

**Files:**

- Create: `apps/web/src/features/feedback/FeedbackControl.tsx`
- Create: `apps/web/src/features/feedback/FeedbackControl.test.tsx`
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/prototype-flow.spec.ts`
- Modify: `apps/web/src/features/result/CritiqueSections.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**

- Produces: in-memory `Record<string, FeedbackChoice>`.
- Consumes: suggestion IDs only; feedback evaluates advice, never a reshot or modified photo.
- E2E flow: `/` → `/analyze` → `/result` → evidence/tool/feedback interactions.

- [ ] **Step 1: Write failing feedback and browser tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackControl } from './FeedbackControl';

it('selects and reverses feedback for one suggestion in memory', async () => {
  const user = userEvent.setup();
  render(<FeedbackControl suggestionId="i1" />);
  await user.click(screen.getByRole('button', { name: '有帮助' }));
  expect(screen.getByRole('button', { name: '有帮助' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('反馈只保存在本次原型中')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '有帮助' }));
  expect(screen.getByRole('button', { name: '有帮助' })).toHaveAttribute('aria-pressed', 'false');
});
```

```ts
import { expect, test } from '@playwright/test';

test('completes the dynamic fixed-sample flow without upload, API or reshoot feedback', async ({ page }) => {
  const businessRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/') || request.method() !== 'GET') businessRequests.push(request.url());
  });

  await page.goto('/');
  await page.getByRole('link', { name: '开始看一张照片' }).click();
  await page.getByLabel('拍摄想法').fill('我想保留车辆停在旷野中的安静感。');
  await page.getByRole('button', { name: '纪实' }).click();
  await page.getByRole('button', { name: '开始分析' }).click();
  await expect(page.getByRole('button', { name: '正在读照片…' })).toBeDisabled();
  await expect(page).toHaveURL('/result');
  await expect(page.getByText('82')).toBeVisible();
  await page.getByRole('button', { name: '构图' }).click();
  await expect(page.getByText('轨道引导线')).toBeVisible();
  await page.getByRole('button', { name: '参数建议' }).click();
  await page.locator('[aria-label="建议 i1 的反馈"]').getByRole('button', { name: '有帮助' }).click();
  await expect(page.getByText('反馈只保存在本次原型中')).toBeVisible();
  await expect(page.getByRole('button', { name: /上传重拍|提交重拍/ })).toHaveCount(0);
  expect(businessRequests).toEqual([]);
});
```

- [ ] **Step 2: Run the failing tests**

Run: `pnpm --filter @photo-mentor/web test src/features/feedback && pnpm e2e -- prototype-flow.spec.ts`

Expected: FAIL because feedback controls and complete route behavior are missing.

- [ ] **Step 3: Implement reversible in-memory feedback**

```tsx
'use client';

import { useState } from 'react';
import type { FeedbackChoice } from '../prototype/contracts';

const choices: Array<[FeedbackChoice, string]> = [
  ['accurate', '准确'],
  ['helpful', '有帮助'],
  ['misunderstood', '误解意图'],
  ['not_applicable', '不适用'],
];

export function FeedbackControl({ suggestionId }: { suggestionId: string }) {
  const [selected, setSelected] = useState<FeedbackChoice | null>(null);
  return (
    <div aria-label={`建议 ${suggestionId} 的反馈`}>
      {choices.map(([value, label]) => (
        <button key={value} type="button" aria-pressed={selected === value} onClick={() => setSelected(selected === value ? null : value)}>{label}</button>
      ))}
      <p aria-live="polite">{selected ? '反馈只保存在本次原型中' : '你可以只评价这条建议，不需要上传新的照片。'}</p>
    </div>
  );
}
```

Render one `FeedbackControl` below every strength and improvement card. Do not label feedback as model-training consent.

- [ ] **Step 4: Configure Playwright and verify the full flow**

Use `webServer.command: 'pnpm dev'`, `webServer.url: 'http://127.0.0.1:3000'`, `use.baseURL` with the same URL, and projects for Chromium desktop plus a 390×844 mobile viewport.

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm e2e -- prototype-flow.spec.ts`

Expected: unit, type, lint and both viewport E2E runs exit 0; no business request is observed.

- [ ] **Step 5: Run the production build**

Run: `pnpm --filter @photo-mentor/web build`

Expected: Next.js build exits 0 and generates `/`, `/analyze`, `/result`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/feedback apps/web/src/features/result/CritiqueSections.tsx apps/web/e2e apps/web/playwright.config.ts apps/web/src/app/globals.css
git commit -m "feat: complete dynamic prototype flow"
```

### Task 9: 执行无讲解可用性测试并决定是否进入功能 MVP

**Files:**

- Create: `docs/research/prototype-usability-script.md`
- Create after sessions: `docs/research/prototype-usability-results-2026-07-23.md`
- Modify: `docs/product/ROADMAP.md`

**Interfaces:**

- Consumes: completed fixed-sample prototype and five consenting adult target users.
- Produces: anonymized completion evidence,理解偏差、关键阻塞和 Stage 2 的 go/no-go 决定。

- [ ] **Step 1: Write the exact unassisted research task**

```markdown
请从主页开始，用固定样例完成一次照片分析。完成后告诉我：

1. 这个产品与普通“给照片打一个分”的工具有什么不同？
2. 哪一条描述或建议让你感觉它真的看了这张照片？
3. 你是否认为刚才上传了自己的照片、修改了原图，或使用了真实 AI？
4. 你愿不愿意以后用它分析另一张照片？为什么？
```

Record only participant code, completion yes/no, time band, blocking step, evidence viewed, one consented paraphrase, and the four answers. Do not collect names, photos, account data or raw screen recordings.

- [ ] **Step 2: Define the exit criteria**

Stage 1 passes only when:

- all five participants finish without coaching;
- at least four explain that分数后面有图上或文字证据，而不是只有数字;
- at least four identify one photo-specific description, strength or improvement;
- no participant believes the fixed sample was their upload, the original pixels were overwritten, or the progress represented a real AI call;
- at least three say they would use the product again for another photo;
- no critical keyboard or 390px mobile blocker remains.

- [ ] **Step 3: Run five sessions and write anonymized results**

Run: `pnpm dev`

Expected: the researcher can reset all state by refreshing; no participant data enters the repository except the anonymized table.

- [ ] **Step 4: Record the evidence-based roadmap decision**

If all exit criteria pass, add “Stage 1 passed” with the test date to `docs/product/ROADMAP.md` and authorize a new Stage 2 plan for privacy-safe uploads, model gateway and history. If any criterion fails, list the exact failed criterion and create one narrowly scoped revision task before any backend or AI work.

- [ ] **Step 5: Commit research evidence**

```bash
git add docs/research/prototype-usability-script.md docs/research/prototype-usability-results-2026-07-23.md docs/product/ROADMAP.md
git commit -m "docs: record dynamic prototype usability decision"
```

## Self-review

- Spec coverage: Tasks 3–8 cover the homepage, optional context, inline analysis stages, total and five scores, score colors, photo-specific description, strengths, improvements, overlays, crop, parameter entry, future reference and advice-only feedback.
- Dynamic boundary: every visible interaction uses browser state; no task adds a business API, upload input, model client, database, quota mutation or payment.
- Reshoot boundary: the schema has `nextShootSuggestions` and rejects comparison versions; no task asks the user to reshoot, modify or upload proof.
- Emotional value: fixtures and result components describe this specific photograph before improvements and avoid empty praise or humiliating labels.
- Privacy: all images are local documented samples, and E2E explicitly checks that no API or non-GET request occurs.
- Type consistency: Tasks 3–8 consume types derived from `CritiqueResultSchema`; field names are `overallScore`, `dimensions`, `annotations`, `cropCandidates`, `postProcessSuggestions` and `nextShootSuggestions` throughout.
- Placeholder scan: the plan contains no unspecified service, deferred implementation step or unnamed error handler.
