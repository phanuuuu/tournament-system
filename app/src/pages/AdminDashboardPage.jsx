import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToDisputedMatches, subscribeToContactIssueMatches, subscribeToScheduledMatches } from "../firebase/matches";
import { subscribeToLeagues } from "../firebase/leagues";

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const [disputed, setDisputed] = useState(null);
  const [contactIssues, setContactIssues] = useState(null);
  const [stale, setStale] = useState(null);
  const [leagues, setLeagues] = useState(null);

  useEffect(() => subscribeToDisputedMatches(setDisputed), []);
  useEffect(() => subscribeToContactIssueMatches(setContactIssues), []);
  useEffect(() => subscribeToScheduledMatches(setStale), []);
  useEffect(() => subscribeToLeagues(setLeagues), []);

  const disputedCount = disputed?.length ?? 0;
  const contactIssueCount = contactIssues?.length ?? 0;
  const actionCount = disputedCount + contactIssueCount;
  const staleCount = stale?.length ?? 0;

  const openCount = leagues?.filter((l) => l.status === "open").length ?? 0;
  const ongoingCount = leagues?.filter((l) => l.status === "ongoing").length ?? 0;
  const finishedCount = leagues?.filter((l) => l.status === "finished").length ?? 0;

  return (
    <div className="page">
      <h1>แผงแอดมิน</h1>
      <p>สวัสดีแอดมิน {profile?.displayName}</p>

      <Link to="/admin/disputes" className="dashboard-card">
        <span>ต้องลงมือ</span>
        <span className={actionCount > 0 ? "dashboard-number-alert" : "dashboard-number"}>{actionCount}</span>
      </Link>

      <div className="dashboard-subitems">
        <Link to="/admin/disputes">
          ข้อพิพาท (สกอร์ไม่ตรง): <strong>{disputedCount}</strong>
        </Link>
        <Link to="/admin/disputes">
          คำขอติดต่อไม่ได้ (ถ้วย): <strong>{contactIssueCount}</strong>
        </Link>
      </div>

      <Link to="/admin/stale-matches" className="dashboard-card">
        <span>แมตช์ค้าง (ยังไม่มีใครส่งผล)</span>
        <span className="dashboard-number">{staleCount}</span>
      </Link>

      <Link to="/admin/leagues" className="dashboard-card">
        <span>ลีคทั้งหมด</span>
        <span className="dashboard-number">{leagues?.length ?? 0}</span>
      </Link>
      <p className="dashboard-breakdown">
        เปิดรับสมัคร {openCount} · กำลังแข่ง {ongoingCount} · จบแล้ว {finishedCount}
      </p>

      <nav className="admin-nav">
        <Link to="/admin/leagues/new">+ สร้างลีคใหม่</Link>
        <Link to="/profile">โปรไฟล์</Link>
      </nav>
    </div>
  );
}
