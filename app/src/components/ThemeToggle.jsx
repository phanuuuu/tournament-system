import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      aria-pressed={isDark}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb">{isDark ? "🌙" : "☀️"}</span>
      </span>
    </button>
  );
}
