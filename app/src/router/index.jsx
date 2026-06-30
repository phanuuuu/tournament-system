import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ProtectedRoute, GuestRoute, AdminRoute } from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import CompleteProfilePage from "../pages/CompleteProfilePage";
import ProfilePage from "../pages/ProfilePage";
import HomePage from "../pages/HomePage";
import LeagueListPage from "../pages/LeagueListPage";
import LeaguePublicDetailPage from "../pages/LeaguePublicDetailPage";
import MatchPage from "../pages/MatchPage";
import NotFoundPage from "../pages/NotFoundPage";
import AppLayout from "../components/AppLayout";
import GuestLayout from "../components/GuestLayout";
import Spinner from "../components/Spinner";

// หน้าแอดมินแยก chunk ออกจาก bundle หลัก — ผู้เล่นทั่วไป (ส่วนใหญ่ของผู้ใช้) ไม่ต้องโหลดโค้ดนี้เลย
const AdminDashboardPage = lazy(() => import("../pages/AdminDashboardPage"));
const AdminLeagueListPage = lazy(() => import("../pages/AdminLeagueListPage"));
const AdminCreateLeaguePage = lazy(() => import("../pages/AdminCreateLeaguePage"));
const AdminLeagueDetailPage = lazy(() => import("../pages/AdminLeagueDetailPage"));
const AdminDisputesPage = lazy(() => import("../pages/AdminDisputesPage"));
const AdminStaleMatchesPage = lazy(() => import("../pages/AdminStaleMatchesPage"));
const AdminOneSubmittedPage = lazy(() => import("../pages/AdminOneSubmittedPage"));

function PageLoader() {
  return (
    <div className="page-loader">
      <Spinner size="lg" />
    </div>
  );
}

function SuspendedOutlet() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

function RootPage() {
  const { profile } = useAuth();
  if (profile?.role === "admin") {
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminDashboardPage />
      </Suspense>
    );
  }
  return <HomePage />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<GuestLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/" element={<RootPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/leagues" element={<LeagueListPage />} />
            <Route path="/leagues/:leagueId" element={<LeaguePublicDetailPage />} />
            <Route path="/matches/:matchId" element={<MatchPage />} />

            <Route element={<AdminRoute />}>
              <Route element={<SuspendedOutlet />}>
                <Route path="/admin/leagues" element={<AdminLeagueListPage />} />
                <Route path="/admin/leagues/new" element={<AdminCreateLeaguePage />} />
                <Route path="/admin/leagues/:leagueId" element={<AdminLeagueDetailPage />} />
                <Route path="/admin/disputes" element={<AdminDisputesPage />} />
                <Route path="/admin/stale-matches" element={<AdminStaleMatchesPage />} />
                <Route path="/admin/one-submitted" element={<AdminOneSubmittedPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
