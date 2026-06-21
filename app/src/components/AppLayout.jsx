import { Outlet, Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

export default function AppLayout() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          ระบบจัดการแข่งเกม
        </Link>
        <div className="app-header-actions">
          <ThemeToggle />
          <NotificationBell />
          <span className="app-user-name">{profile?.displayName}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            ออกจากระบบ
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
