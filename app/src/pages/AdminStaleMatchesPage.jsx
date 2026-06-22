import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToScheduledMatches } from "../firebase/matches";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import BackLink from "../components/BackLink";
import { CheckCircle2 } from "lucide-react";

export default function AdminStaleMatchesPage() {
  const [matches, setMatches] = useState(null);

  useEffect(() => subscribeToScheduledMatches(setMatches), []);

  const allUids = (matches ?? []).flatMap((m) => [m.players.home, m.players.away]);
  const profiles = usePublicProfiles(allUids);

  return (
    <div className="page">
      <BackLink to="/">แผงแอดมิน</BackLink>
      <h1>แมตช์ค้าง (ยังไม่มีใครส่งผล)</h1>
      <p>รายการนี้เป็นข้อมูลประกอบการตัดสินใจเท่านั้น ไม่ต้องลงมือก็ได้ — เผื่ออยากติดตามว่าใครยังไม่แข่ง</p>

      {matches === null && (
        <ul className="league-list">
          {[0, 1].map((i) => (
            <li key={i}>
              <Skeleton width="70%" height="14px" />
            </li>
          ))}
        </ul>
      )}

      {matches?.length === 0 && <EmptyState icon={CheckCircle2} title="ไม่มีแมตช์ค้าง" subtitle="ทุกคนส่งผลกันหมดแล้ว" />}

      <ul className="league-list">
        {matches?.map((m) => (
          <li key={m.id}>
            <Link to={`/matches/${m.id}`}>
              <code>{m.matchCode}</code> — {profiles[m.players.home]?.displayName} vs{" "}
              {profiles[m.players.away]?.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
