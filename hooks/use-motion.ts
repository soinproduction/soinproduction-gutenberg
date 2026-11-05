
import {useEffect,useRef} from "react";

/** Progressive enhancement: content stays visible without JS or with reduced motion. */
export function useMotion(pageKey = "") {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;

    const configure = () => {
      observer?.disconnect();
      root.classList.remove("motion-enabled");
      if (preference.matches) return;
      const targets = root.querySelectorAll<HTMLElement>("[data-motion], main > section, main article > section, main article > figure");
      targets.forEach((target) => target.setAttribute("data-motion", ""));
      // Never hide content already visible when enhancement starts.
      targets.forEach((target) => {
        if (target.getBoundingClientRect().top < window.innerHeight) {
          target.classList.add("is-visible");
        }
      });
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer?.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -32px 0px" });
      targets.forEach((target) => observer?.observe(target));
      root.classList.add("motion-enabled");
    };

    configure();
    preference.addEventListener("change", configure);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", configure);
      root.classList.remove("motion-enabled");
    };
  }, [pageKey]);

  return ref;
}