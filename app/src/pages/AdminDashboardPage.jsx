import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboardPage() {
  const { profile } = useAuth();

  return (
    <div className="page">
      <h1>แผงแอดมิน</h1>
      <p>สวัสดีแอดมิน {profile?.displayName}</p>
      <p>แดชบอร์ดสรุป/คิวต้องจัดการ/จัดการลีค จะถูกพัฒนาในเฟส 9</p>
      <Link to="/profile">ไปหน้าโปรไฟล์</Link>
    </div>
  );
}
