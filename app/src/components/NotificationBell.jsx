import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { subscribeToMyNotifications, markNotificationRead, markAllNotificationsRead } from "../firebase/notifications";
import { useToast } from "../context/ToastContext";
import EmptyState from "./EmptyState";

const TYPE_LABEL = {
  opponent_submitted: "คู่แข่งส่งผลแล้ว รอคุณยืนยัน",
  match_approved: "ผลแมตช์อนุมัติแล้ว",
  advanced_round: "คุณเข้ารอบถัดไปแล้ว",
  replay_requested: "แอดมินขอให้แข่งใหม่",
  admin_dispute: "มีข้อพิพาทรอตัดสิน",
  admin_contact_issue: "มีคำขอติดต่อไม่ได้รอดำเนินการ",
};

const CELEBRATE_TOAST = {
  advanced_round: "ผ่านเข้ารอบถัดไปแล้ว!",
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
  const showToast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [bounce, setBounce] = useState(false);
  const seenIdsRef = useRef(null);

  useEffect(() => {
    return subscribeToMyNotifications(user.uid, (list) => {
      // โหลดครั้งแรก แค่บันทึก id ที่เห็นแล้วไว้ ไม่ฉลอง/เด้ง (กันแจ้งเตือนเก่ารัวตอนเพิ่งเปิดแอป)
      if (seenIdsRef.current === null) {
        seenIdsRef.current = new Set(list.map((n) => n.id));
        setNotifications(list);
        return;
      }
      const newOnes = list.filter((n) => !seenIdsRef.current.has(n.id));
      seenIdsRef.current = new Set(list.map((n) => n.id));
      setNotifications(list);
      if (newOnes.length === 0) return;
      setBounce(true);
      setTimeout(() => setBounce(false), 650);
      for (const n of newOnes) {
        if (CELEBRATE_TOAST[n.type]) showToast(CELEBRATE_TOAST[n.type], "success");
      }
    });
  }, [user.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleClickNotification(n) {
    if (!n.read) await markNotificationRead(n.id);
    setOpen(false);
    navigate(linkFor(n));
  }

  return (
    <div className="notification-bell">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="การแจ้งเตือน">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={`notification-badge ${bounce ? "notification-badge-bounce" : ""}`}>{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          {notifications.length === 0 && <EmptyState compact icon={BellOff} title="ยังไม่มีการแจ้งเตือน" />}
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
