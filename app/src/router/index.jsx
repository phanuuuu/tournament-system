import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute, GuestRoute } from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import CompleteProfilePage from "../pages/CompleteProfilePage";
import ProfilePage from "../pages/ProfilePage";
import HomePage from "../pages/HomePage";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import NotFoundPage from "../pages/NotFoundPage";

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
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/" element={<RootPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
