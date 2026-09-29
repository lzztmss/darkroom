'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

type HistoricalSlide = {
  src: string;
  alt: string;
  author: string;
  work: string;
  rights: string;
};

export function ContactSheetCarousel({ slides }: { slides: readonly HistoricalSlide[] }) {
  const [index, setIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || typeof IntersectionObserver === 'undefined') {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  if (slides.length === 0) {
    return null;
  }

  const move = (delta: number) => {
    setIndex((current) => (current + delta + slides.length) % slides.length);
  };

  const trackStyle = { '--slide-index': index } as CSSProperties;
  const progressStyle = { transform: `scaleX(${(index + 1) / slides.length})` };

  return (
    <section
      className={`contact-sheet${isRevealed ? ' contact-sheet--revealed' : ''}`}
      aria-label="摄影史作品接触印样"
      ref={sectionRef}
    >
      <div className="contact-sheet__viewport">
        <div className="contact-sheet__track" style={trackStyle}>
          {slides.map((slide, slideIndex) => (
            <article
              className={`contact-sheet__slide${slideIndex === index ? ' is-active' : ''}`}
              aria-hidden={slideIndex !== index}
              key={slide.src}
            >
              <figure>
                <div className="contact-sheet__photo">
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    width={1600}
                    height={1067}
                    priority={slideIndex === 0}
                    sizes="(max-width: 900px) 86vw, 58vw"
                  />
                </div>
                <figcaption>
                  <span>
                    <strong>{slide.author}</strong>
                    {slide.work}
                  </span>
                  <span className="contact-sheet__rights">{slide.rights}</span>
                </figcaption>
              </figure>
            </article>
          ))}
        </div>
      </div>

      <div className="contact-sheet__controls">
        <div className="contact-sheet__arrows">
          <button type="button" aria-label="上一张" onClick={() => move(-1)}>
            ←
          </button>
          <button type="button" aria-label="下一张" onClick={() => move(1)}>
            →
          </button>
        </div>
        <div className="contact-sheet__counter">
          <span aria-live="polite">
            {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </span>
          <span className="contact-sheet__progress" aria-hidden="true">
            <span style={progressStyle} />
          </span>
        </div>
      </div>
    </section>
  );
}
