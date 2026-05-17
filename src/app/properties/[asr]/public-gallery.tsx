"use client";

/**
 * 매물 상세 사진 갤러리 (공개 페이지용).
 *
 *  - 메인 큰 사진 1장
 *  - 하단 썸네일 가로 스크롤 (active 하이라이트)
 *  - 사진 1장이면 썸네일 영역 숨김
 */
import { useState } from "react";

export function PublicGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;
  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="bg-blue-950/40 border border-white/15 rounded-lg overflow-hidden backdrop-blur-sm">
      {/* 메인 */}
      <div className="aspect-[16/9] bg-blue-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 썸네일 */}
      {images.length > 1 && (
        <div className="border-t border-white/10 bg-blue-950/60 p-2 flex gap-2 overflow-x-auto">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={
                "flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 transition-all " +
                (i === active
                  ? "border-cyan-400 ring-2 ring-cyan-400/30"
                  : "border-transparent hover:border-cyan-400/60 opacity-60 hover:opacity-100")
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${alt} ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
