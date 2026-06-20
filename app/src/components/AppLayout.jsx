import { Outlet, Link } from "react-router-dom";
import NotificationBell from "./NotificationBell";

export default function AppLayout() {
  return (
    <div>
      <header className="app-header">
        <Link to="/">ระบบจัดการแข่งเกม</Link>
        <NotificationBell />
      </header>
      <Outlet />
    </div>
  );
}
