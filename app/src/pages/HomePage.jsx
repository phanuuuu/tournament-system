import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { profile } = useAuth();

  return (
    <div className="page">
      <h1>สวัสดี, {profile?.displayName}</h1>
      <p>หน้าหลักผู้เล่น (กล่อง "ต้องทำต่อ" และ "ลีคของฉัน") จะถูกพัฒนาในเฟสถัดไป</p>
      <Link to="/profile">ไปหน้าโปรไฟล์</Link>
    </div>
  );
}
