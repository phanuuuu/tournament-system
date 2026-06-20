import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboardPage() {
  const { profile } = useAuth();

  return (
    <div className="page">
      <h1>แผงแอดมิน</h1>
      <p>สวัสดีแอดมิน {profile?.displayName}</p>
      <p>แดชบอร์ดสรุป/คิวต้องจัดการแบบเต็มจะถูกพัฒนาในเฟส 9</p>
      <nav className="admin-nav">
        <Link to="/admin/leagues">จัดการลีค</Link>
        <Link to="/admin/disputes">ข้อพิพาท</Link>
        <Link to="/profile">โปรไฟล์</Link>
      </nav>
    </div>
  );
}
