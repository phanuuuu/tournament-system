import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { subscribeToLeague } from "../firebase/leagues";
import { subscribeToLeagueMatches } from "../firebase/matches";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import MatchListRaw from "../components/MatchListRaw";

const FORMAT_LABEL = { cup: "ชิงถ้วย", points: "เก็บแต้ม" };
const MATCH_TYPE_LABEL = { single: "นัดเดียว", homeAway: "เหย้า-เยือน" };
const STATUS_LABEL = { open: "เปิดรับสมัคร", ongoing: "กำลังแข่ง", finished: "จบแล้ว" };

export default function LeaguePublicDetailPage() {
  const { leagueId } = useParams();
  const [league, setLeague] = useState(undefined);
  const [matches, setMatches] = useState([]);
  const profiles = usePublicProfiles(league?.playerIds);

  useEffect(() => subscribeToLeague(leagueId, setLeague), [leagueId]);
  useEffect(() => subscribeToLeagueMatches(leagueId, setMatches), [leagueId]);

  if (league === undefined) return <p>กำลังโหลด...</p>;
  if (league === null) return <p>ไม่พบลีคนี้</p>;

  return (
    <div className="page">
      <Link to="/leagues">← ลีคทั้งหมด</Link>
      <h1>{league.name}</h1>
      <p>
        {FORMAT_LABEL[league.format]} ({MATCH_TYPE_LABEL[league.matchType]}) — {STATUS_LABEL[league.status]}
      </p>
      <p>
        ผู้เล่น: {league.playerIds.length}/{league.size}
      </p>

      <ul>
        {league.playerIds.map((uid) => (
          <li key={uid}>{profiles[uid]?.displayName ?? "กำลังโหลด..."}</li>
        ))}
      </ul>

      {matches.length > 0 && <MatchListRaw matches={matches} profiles={profiles} />}
    </div>
  );
}
