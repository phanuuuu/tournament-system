import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToLeagues } from "../firebase/leagues";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { Trophy } from "lucide-react";

const FORMAT_LABEL = { cup: "ชิงถ้วย", points: "เก็บแต้ม" };
const STATUS_LABEL = { open: "เปิดรับสมัคร", ongoing: "กำลังแข่ง", finished: "จบแล้ว" };
const STATUS_COLOR = { open: "yellow", ongoing: "green", finished: "gray" };

export default function AdminLeagueListPage() {
  const [leagues, setLeagues] = useState(null);

  useEffect(() => subscribeToLeagues(setLeagues), []);

  return (
    <div className="page">
      <h1>ลีคทั้งหมด</h1>
      <Link to="/admin/leagues/new" className="btn-primary btn-link">
        + สร้างลีคใหม่
      </Link>

      {leagues === null && (
        <ul className="league-list">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <span style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <Skeleton width="60%" height="16px" />
                <Skeleton width="40%" height="12px" />
              </span>
            </li>
          ))}
        </ul>
      )}

      {leagues?.length === 0 && <EmptyState icon={Trophy} title="ยังไม่มีลีค" subtitle="กดสร้างลีคใหม่เพื่อเริ่มการแข่งขัน" />}

      <ul className="league-list">
        {leagues?.map((league) => (
          <li key={league.id}>
            <Link to={`/admin/leagues/${league.id}`} className="league-card-info">
              <span className="league-card-title">{league.name}</span>
              <span className="league-card-meta">
                {FORMAT_LABEL[league.format]} · {league.playerIds.length}/{league.size} คน
              </span>
            </Link>
            <span className={`status-badge status-${STATUS_COLOR[league.status]}`}>{STATUS_LABEL[league.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
