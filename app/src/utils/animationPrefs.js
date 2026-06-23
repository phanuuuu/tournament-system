const SKIP_KEY = "cupBracketSkipAnimation";

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function getStoredSkipAnimation() {
  return typeof window !== "undefined" && window.localStorage.getItem(SKIP_KEY) === "1";
}

export function setStoredSkipAnimation(skip) {
  if (typeof window === "undefined") return;
  if (skip) window.localStorage.setItem(SKIP_KEY, "1");
  else window.localStorage.removeItem(SKIP_KEY);
}
