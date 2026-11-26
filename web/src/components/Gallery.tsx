"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  return (
    <div className="space-y-3">
      <div className="card aspect-square overflow-hidden bg-slate-100">
        {images[i] && <img src={images[i]} alt={alt} className="h-full w-full object-contain" />}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, n) => (
            <button key={src} onClick={() => setI(n)} className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${n === i ? "border-brand-600" : "border-transparent"}`}>
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
