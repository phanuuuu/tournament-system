import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { profile } = useAuth();

  return (
    <div className="page">
      <h1>สวัสดี, {profile?.displayName}</h1>
      <p>กล่อง "ต้องทำต่อ" และ "ลีคของฉัน" จะถูกพัฒนาในเฟสถัดไป (ต้องมีระบบส่งผลก่อน)</p>
      <nav className="admin-nav">
        <Link to="/leagues">ลีคทั้งหมด</Link>
        <Link to="/profile">โปรไฟล์</Link>
      </nav>
    </div>
  );
}
