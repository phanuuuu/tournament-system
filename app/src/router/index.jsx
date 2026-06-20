import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute, GuestRoute, AdminRoute } from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import CompleteProfilePage from "../pages/CompleteProfilePage";
import ProfilePage from "../pages/ProfilePage";
import HomePage from "../pages/HomePage";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminLeagueListPage from "../pages/AdminLeagueListPage";
import AdminCreateLeaguePage from "../pages/AdminCreateLeaguePage";
import AdminLeagueDetailPage from "../pages/AdminLeagueDetailPage";
import LeagueListPage from "../pages/LeagueListPage";
import LeaguePublicDetailPage from "../pages/LeaguePublicDetailPage";
import MatchPage from "../pages/MatchPage";
import AdminDisputesPage from "../pages/AdminDisputesPage";
import AdminStaleMatchesPage from "../pages/AdminStaleMatchesPage";
import NotFoundPage from "../pages/NotFoundPage";
import AppLayout from "../components/AppLayout";

function RootPage() {
  const { profile } = useAuth();
  return profile?.role === "admin" ? <AdminDashboardPage /> : <HomePage />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
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
              <Route path="/admin/leagues" element={<AdminLeagueListPage />} />
              <Route path="/admin/leagues/new" element={<AdminCreateLeaguePage />} />
              <Route path="/admin/leagues/:leagueId" element={<AdminLeagueDetailPage />} />
              <Route path="/admin/disputes" element={<AdminDisputesPage />} />
              <Route path="/admin/stale-matches" element={<AdminStaleMatchesPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
