"use client";

import { useEffect } from "react";

/**
 * Progressive-enhancement scroll reveal for the landing page. Adds `.in` to any
 * `.reveal` element once it scrolls into view. Reduced-motion is handled in CSS
 * (the `.reveal` elements are visible by default there).
 */
export function RevealOnScroll() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".lp .reveal");
    if (!("IntersectionObserver" in window) || els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
