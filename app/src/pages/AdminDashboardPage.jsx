import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Swords, Trophy, Plus, User, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToDisputedMatches,
  subscribeToContactIssueMatches,
  subscribeToScheduledMatches,
  subscribeToOneSubmittedMatches,
} from "../firebase/matches";
import { subscribeToLeagues } from "../firebase/leagues";

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const [disputed, setDisputed] = useState(null);
  const [contactIssues, setContactIssues] = useState(null);
  const [stale, setStale] = useState(null);
  const [oneSubmitted, setOneSubmitted] = useState(null);
  const [leagues, setLeagues] = useState(null);

  useEffect(() => subscribeToDisputedMatches(setDisputed), []);
  useEffect(() => subscribeToContactIssueMatches(setContactIssues), []);
  useEffect(() => subscribeToScheduledMatches(setStale), []);
  useEffect(() => subscribeToOneSubmittedMatches(setOneSubmitted), []);
  useEffect(() => subscribeToLeagues(setLeagues), []);

  const disputedCount = disputed?.length ?? 0;
  const contactIssueCount = contactIssues?.length ?? 0;
  const actionCount = disputedCount + contactIssueCount;
  const staleCount = stale?.length ?? 0;
  const oneSubmittedCount = oneSubmitted?.length ?? null;

  const openCount = leagues?.filter((l) => l.status === "open").length ?? 0;
  const ongoingCount = leagues?.filter((l) => l.status === "ongoing").length ?? 0;
  const finishedCount = leagues?.filter((l) => l.status === "finished").length ?? 0;

  return (
    <div className="page">
      <div className="admin-dashboard-header">
        <h1>แผงแอดมิน</h1>
        <p className="dashboard-greeting">สวัสดี {profile?.displayName}</p>
      </div>

      <section className="dashboard-section">
        <h2 className="dashboard-section-title">ต้องลงมือ</h2>

        <Link
          to="/admin/disputes"
          className={`dashboard-card dashboard-card-row${actionCount > 0 ? " dashboard-card-alert" : ""}`}
        >
          <span className="dashboard-card-icon" aria-hidden="true">
            <AlertTriangle size={22} />
          </span>
          <span className="dashboard-card-body">
            <span className="dashboard-card-label">ข้อพิพาทและคำขอ</span>
            <span className="dashboard-card-chips">
              <span className="dashboard-chip dashboard-chip-danger">ข้อพิพาท {disputedCount}</span>
              <span className="dashboard-chip">ติดต่อไม่ได้ {contactIssueCount}</span>
            </span>
          </span>
          <span className="dashboard-card-right">
            {actionCount > 0 ? (
              <span className="alert-badge alert-badge-pulse">{actionCount}</span>
            ) : (
              <span className="dashboard-number">{actionCount}</span>
            )}
            <ChevronRight size={18} aria-hidden="true" />
          </span>
        </Link>

        <Link
          to="/admin/one-submitted"
          className={`dashboard-card dashboard-card-row${oneSubmittedCount > 0 ? " dashboard-card-warn" : ""}`}
        >
          <span className="dashboard-card-icon" aria-hidden="true">
            <Clock size={22} />
          </span>
          <span className="dashboard-card-body">
            <span className="dashboard-card-label">ส่งผลแล้วฝ่ายเดียว / รอตัดสิน</span>
          </span>
          <span className="dashboard-card-right">
            <span className={`dashboard-number${oneSubmittedCount > 0 ? " dashboard-number-warn" : ""}`}>
              {oneSubmittedCount ?? "…"}
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </span>
        </Link>
      </section>

      <section className="dashboard-section">
        <h2 className="dashboard-section-title">ภาพรวม</h2>
        <div className="dashboard-stat-grid">
          <Link to="/admin/stale-matches" className="dashboard-card dashboard-stat-card">
            <span className="dashboard-stat-icon" aria-hidden="true">
              <Swords size={26} />
            </span>
            <span className="dashboard-stat-number">{staleCount}</span>
            <span className="dashboard-stat-label">แมตช์ค้าง</span>
            <ChevronRight size={14} className="dashboard-stat-chevron" aria-hidden="true" />
          </Link>

          <Link to="/admin/leagues" className="dashboard-card dashboard-stat-card">
            <span className="dashboard-stat-icon" aria-hidden="true">
              <Trophy size={26} />
            </span>
            <span className="dashboard-stat-number">{leagues?.length ?? "…"}</span>
            <span className="dashboard-stat-label">ลีคทั้งหมด</span>
            <span className="dashboard-stat-sub">
              <span className="dashboard-chip">เปิด {openCount}</span>
              <span className="dashboard-chip dashboard-chip-accent">แข่ง {ongoingCount}</span>
              <span className="dashboard-chip">จบ {finishedCount}</span>
            </span>
            <ChevronRight size={14} className="dashboard-stat-chevron" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <nav className="admin-quick-actions">
        <Link to="/admin/leagues/new" className="btn-link btn-primary admin-action-btn">
          <Plus size={16} aria-hidden="true" />
          สร้างลีคใหม่
        </Link>
        <Link to="/profile" className="home-button">
          <User size={18} aria-hidden="true" />
          <span className="home-button-label">โปรไฟล์</span>
        </Link>
      </nav>
    </div>
  );
}
