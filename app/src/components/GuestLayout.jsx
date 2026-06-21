import ThemeToggle from "./ThemeToggle";
import RouteTransition from "./RouteTransition";

export default function GuestLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-brand">TOURNAMENT SYSTEM</span>
        <ThemeToggle />
      </header>
      <main className="app-main">
        <RouteTransition />
      </main>
    </div>
  );
}
