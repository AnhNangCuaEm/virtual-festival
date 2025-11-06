"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import React, { useEffect, useState } from "react";

export const InfiniteGallery = ({
  images,
  direction = "left",
  speed = "normal",
  pauseOnHover = true,
  stagger = false,
  staggerAmount = 8,
  className,
}: {
  images: string[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  stagger?: boolean;
  staggerAmount?: number;
  className?: string;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);

  const [start, setStart] = useState(false);

  // Duplicate items once on mount to create the infinite scroll effect
  useEffect(() => {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);
      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        scrollerRef.current!.appendChild(duplicatedItem);
      });
      setStart(true);
    }
  }, []);

  // Update direction via CSS variable
  useEffect(() => {
    if (!containerRef.current) return;
    if (direction === "left") {
      containerRef.current.style.setProperty(
        "--animation-direction",
        "forwards"
      );
    } else {
      containerRef.current.style.setProperty(
        "--animation-direction",
        "reverse"
      );
    }
  }, [direction]);

  // Update speed via CSS variable
  useEffect(() => {
    if (!containerRef.current) return;
    if (speed === "fast") {
      containerRef.current.style.setProperty("--animation-duration", "20s");
    } else if (speed === "normal") {
      containerRef.current.style.setProperty("--animation-duration", "40s");
    } else {
      containerRef.current.style.setProperty("--animation-duration", "80s");
    }
  }, [speed]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 flex-nowrap gap-4 py-4",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
      >
        {images.map((image, idx) => {
          const offset = stagger
            ? (idx % 2 === 0 ? -1 : 1) * Number(staggerAmount)
            : 0;
          return (
            <li
              key={`${image}-${idx}`}
              className="relative aspect-[3/4] w-28 max-w-full shrink-0 rounded-lg border border-white/20 bg-gradient-to-br from-white/10 to-white/5 overflow-hidden"
              style={
                offset ? { transform: `translateY(${offset}px)` } : undefined
              }
            >
              <Image
                src={image}
                alt={`Gallery ${idx}`}
                fill
                className="object-cover"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};
