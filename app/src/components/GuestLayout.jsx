import { Outlet } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

export default function GuestLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-brand">ระบบจัดการแข่งเกม</span>
        <ThemeToggle />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
