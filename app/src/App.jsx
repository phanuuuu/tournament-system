import { AuthProvider, useAuth } from "./context/AuthContext";
import "./App.css";

function StatusView() {
  const { user, loading } = useAuth();

  return (
    <section id="center">
      <div>
        <h1>ระบบจัดการแข่งเกม</h1>
        <p>เฟส 1: ตั้งโครงโปรเจกต์ + Firebase</p>
        <p>สถานะการเชื่อมต่อ Firebase: เชื่อมต่อสำเร็จ</p>
        <p>สถานะผู้ใช้: {loading ? "กำลังโหลด..." : user ? "ล็อกอินแล้ว" : "ยังไม่ล็อกอิน (ปกติ — ระบบบัญชีจะทำในเฟส 2)"}</p>
      </div>
    </section>
  );
}

function App() {
  return (
    <AuthProvider>
      <StatusView />
    </AuthProvider>
  );
}

export default App;
