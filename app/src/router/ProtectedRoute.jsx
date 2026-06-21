import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";

const PageLoader = () => (
  <div className="page-loader" style={{ minHeight: "100vh" }}>
    <Spinner size="lg" />
  </div>
);

export function ProtectedRoute() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile && location.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" replace />;
  }
  if (profile && location.pathname === "/complete-profile") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}

export function AdminRoute() {
  const { profile, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}
