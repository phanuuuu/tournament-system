import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToLeagues } from "../firebase/leagues";

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

      {leagues === null && <p>กำลังโหลด...</p>}
      {leagues?.length === 0 && <p>ยังไม่มีลีค</p>}

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
