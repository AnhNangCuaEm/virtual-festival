"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import React, { useEffect, useRef, useState, useCallback } from "react";

// Estimated width of each image item (including gap)
const ITEM_WIDTH = 300;
const GAP = 32; // gap-8 = 32px
const BUFFER_ITEMS = 2; // Extra items on each side for smooth scrolling

export const InfiniteGallery = ({
  images,
  direction = "left",
  speed = 50, // pixels per second
  stagger = false,
  staggerAmount = 24,
  className,
}: {
  images: string[];
  direction?: "left" | "right";
  speed?: number;
  pauseOnHover?: boolean;
  stagger?: boolean;
  staggerAmount?: number;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const positionRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });

  // Reverse images so newest appear first
  const reversedImages = React.useMemo(() => [...images].reverse(), [images]);

  // Calculate how many items fit in viewport + buffer
  const calculateVisibleRange = useCallback((scrollPosition: number, containerWidth: number) => {
    const itemTotalWidth = ITEM_WIDTH + GAP;
    const totalWidth = reversedImages.length * itemTotalWidth;
    
    // Normalize position for infinite loop
    const normalizedPos = ((scrollPosition % totalWidth) + totalWidth) % totalWidth;
    
    // Calculate visible indices
    const startIdx = Math.floor(normalizedPos / itemTotalWidth) - BUFFER_ITEMS;
    const visibleCount = Math.ceil(containerWidth / itemTotalWidth) + BUFFER_ITEMS * 2;
    const endIdx = startIdx + visibleCount;

    return { start: startIdx, end: endIdx };
  }, [reversedImages.length]);

  // Get items to render (virtual window)
  const getVisibleItems = useCallback(() => {
    if (reversedImages.length === 0) return [];
    
    const items: { image: string; index: number; originalIndex: number }[] = [];
    const totalImages = reversedImages.length;

    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      // Wrap index for infinite loop
      const originalIndex = ((i % totalImages) + totalImages) % totalImages;
      items.push({
        image: reversedImages[originalIndex],
        index: i,
        originalIndex,
      });
    }

    return items;
  }, [reversedImages, visibleRange]);

  // Animation loop using requestAnimationFrame
  useEffect(() => {
    if (!containerRef.current || reversedImages.length === 0) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const itemTotalWidth = ITEM_WIDTH + GAP;
    const totalWidth = reversedImages.length * itemTotalWidth;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = currentTime;

      // Update position based on speed and direction
      const movement = speed * deltaTime;
      if (direction === "left") {
        positionRef.current += movement;
      } else {
        positionRef.current -= movement;
      }

      // Keep position within bounds for precision
      if (positionRef.current > totalWidth) {
        positionRef.current -= totalWidth;
      } else if (positionRef.current < 0) {
        positionRef.current += totalWidth;
      }

      // Update visible range
      const newRange = calculateVisibleRange(positionRef.current, containerWidth);
      setVisibleRange(prev => {
        if (prev.start !== newRange.start || prev.end !== newRange.end) {
          return newRange;
        }
        return prev;
      });

      // Apply transform to scroller
      if (scrollerRef.current) {
        const offset = -(positionRef.current % totalWidth);
        scrollerRef.current.style.transform = `translateX(${offset}px)`;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = null;
    };
  }, [reversedImages.length, speed, direction, calculateVisibleRange]);

  const visibleItems = getVisibleItems();

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden h-full flex items-center [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]",
        className
      )}
    >
      <div
        ref={scrollerRef}
        className="flex items-center absolute"
        style={{ gap: `${GAP}px` }}
      >
        {visibleItems.map(({ image, index, originalIndex }) => {
          const offset = stagger
            ? (originalIndex % 2 === 0 ? -1 : 1) * staggerAmount
            : 0;
          
          // Position each item absolutely based on its index
          const itemTotalWidth = ITEM_WIDTH + GAP;
          const left = index * itemTotalWidth;

          return (
            <div
              key={`${image}-${index}`}
              className="absolute h-fit shrink-0 rounded-lg overflow-hidden"
              style={{
                left: `${left}px`,
                width: `${ITEM_WIDTH}px`,
                transform: offset ? `translateY(${offset}px)` : undefined,
              }}
            >
              <Image
                src={image}
                alt={`Gallery ${originalIndex}`}
                width={1024}
                height={1536}
                className="h-full w-auto max-h-120"
                loading="lazy"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
