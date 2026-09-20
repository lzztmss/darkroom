import Link from 'next/link';
import { historicalSlides } from '../prototype/fixtures';
import { ContactSheetCarousel } from './ContactSheetCarousel';

export function HomeExperience() {
  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-brand"><span aria-hidden="true" /><strong>暗房</strong></div>
        <p>本地版 · 原图不修改</p>
      </header>

      <section className="home-hero">
        <div className="home-copy">
          <p className="home-kicker">私密分析 · 画面证据 · 可执行建议</p>
          <h1>让照片被认真地看见。</h1>
          <p className="home-intro">
            从构图、光线、色彩、叙事和技术质量理解一张照片。创作意图可以参与解释，但不会替你加分。
          </p>
          <Link className="home-action" href="/analyze"><span>开始分析</span><span aria-hidden="true" /></Link>
          <p className="home-privacy">只发送压缩分析副本；完整原图留在本地。</p>
          <div className="home-quote">
            <blockquote>先说清楚看见了什么，再讨论它可能意味着什么。</blockquote>
            <figcaption>暗房的点评原则</figcaption>
          </div>
        </div>

        <ContactSheetCarousel slides={historicalSlides} />
      </section>
    </main>
  );
}
