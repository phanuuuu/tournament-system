import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToMyNotifications, markNotificationRead, markAllNotificationsRead } from "../firebase/notifications";
import EmptyState from "./EmptyState";

const TYPE_LABEL = {
  opponent_submitted: "คู่แข่งส่งผลแล้ว รอคุณยืนยัน",
  match_approved: "ผลแมตช์อนุมัติแล้ว",
  advanced_round: "คุณเข้ารอบถัดไปแล้ว",
  replay_requested: "แอดมินขอให้แข่งใหม่",
  admin_dispute: "มีข้อพิพาทรอตัดสิน",
  admin_contact_issue: "มีคำขอติดต่อไม่ได้รอดำเนินการ",
};

function linkFor(n) {
  if (n.type === "admin_dispute" || n.type === "admin_contact_issue") return "/admin/disputes";
  if (n.matchId) return `/matches/${n.matchId}`;
  if (n.leagueId) return `/leagues/${n.leagueId}`;
  return "/";
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeToMyNotifications(user.uid, setNotifications), [user.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleClickNotification(n) {
    if (!n.read) await markNotificationRead(n.id);
    setOpen(false);
    navigate(linkFor(n));
  }

  return (
    <div className="notification-bell">
      <button type="button" onClick={() => setOpen((v) => !v)}>
        🔔{unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          {notifications.length === 0 && <EmptyState compact icon="🔔" title="ยังไม่มีการแจ้งเตือน" />}
          {notifications.length > 0 && (
            <button type="button" onClick={() => markAllNotificationsRead(notifications)}>
              อ่านทั้งหมด
            </button>
          )}
          <ul>
            {notifications.map((n) => (
              <li key={n.id} className={n.read ? "" : "notification-unread"}>
                <button type="button" onClick={() => handleClickNotification(n)}>
                  {TYPE_LABEL[n.type] ?? n.type}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
