import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Check, Clock } from "lucide-react";
import { subscribeToOneSubmittedMatches } from "../firebase/matches";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";

export default function AdminOneSubmittedPage() {
  const [matches, setMatches] = useState(null);

  useEffect(() => subscribeToOneSubmittedMatches(setMatches), []);

  const allUids = (matches ?? []).flatMap((m) => [m.players.home, m.players.away]);
  const profiles = usePublicProfiles(allUids);

  return (
    <div className="page">
      <PageHeader backTo="/" backLabel="แผงแอดมิน" />
      <h1>ส่งผลแล้วฝ่ายเดียว</h1>
      <p>ฝ่ายหนึ่งส่งผลแล้ว แต่อีกฝ่ายยังไม่ยืนยัน — กดเข้าไปดูเพื่อตัดสินผลได้เลย</p>

      {matches === null && (
        <ul className="league-list">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton width="70%" height="14px" />
            </li>
          ))}
        </ul>
      )}

      {matches?.length === 0 && (
        <EmptyState icon={CheckCircle2} title="ไม่มีแมตช์รอตัดสิน" subtitle="ทุกคู่ส่งผลครบทั้งสองฝ่ายแล้ว" />
      )}

      <ul className="league-list">
        {matches?.map((m) => {
          const homeSubmitted = !!m.submissions?.[m.players.home];
          const awaySubmitted = !!m.submissions?.[m.players.away];
          const homeName = profiles[m.players.home]?.displayName ?? "…";
          const awayName = profiles[m.players.away]?.displayName ?? "…";
          return (
            <li key={m.id}>
              <Link to={`/matches/${m.id}`} className="one-submitted-row">
                <div className="one-submitted-players">
                  <span className={`one-submitted-player ${homeSubmitted ? "one-submitted-done" : "one-submitted-waiting"}`}>
                    {homeSubmitted
                      ? <Check size={13} aria-hidden="true" />
                      : <Clock size={13} aria-hidden="true" />}
                    {homeName}
                  </span>
                  <span className="one-submitted-vs">vs</span>
                  <span className={`one-submitted-player ${awaySubmitted ? "one-submitted-done" : "one-submitted-waiting"}`}>
                    {awaySubmitted
                      ? <Check size={13} aria-hidden="true" />
                      : <Clock size={13} aria-hidden="true" />}
                    {awayName}
                  </span>
                </div>
                <code className="one-submitted-code">{m.matchCode}</code>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
