'use client';

import { ReactNode } from 'react';

type AnimatedBlockProps = {
  children: ReactNode;
  delay?: number; // en ms
};

export default function AnimatedBlock({
  children,
  delay = 0,
}: AnimatedBlockProps) {
  return (
    <div
      style={{
        animationDelay: `${delay}ms`,
      }}
      className="
        opacity-0
        translate-y-4
        animate-fade-in-slow
        will-change-transform
      "
    >
      {children}
    </div>
  );
}
