import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { subscribeToLeague } from "../firebase/leagues";
import { subscribeToLeagueMatches, createTiebreakerMatch } from "../firebase/matches";
import { subscribeToByeBans } from "../firebase/byeBans";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import { useAuth } from "../context/AuthContext";
import LeagueResultsView from "../components/LeagueResultsView";
import Spinner from "../components/Spinner";

const FORMAT_LABEL = { cup: "ชิงถ้วย", points: "เก็บแต้ม" };
const MATCH_TYPE_LABEL = { single: "นัดเดียว", homeAway: "เหย้า-เยือน" };
const STATUS_LABEL = { open: "เปิดรับสมัคร", ongoing: "กำลังแข่ง", finished: "จบแล้ว" };
const STATUS_COLOR = { open: "yellow", ongoing: "green", finished: "gray" };

export default function LeaguePublicDetailPage() {
  const { leagueId } = useParams();
  const { profile } = useAuth();
  const [league, setLeague] = useState(undefined);
  const [matches, setMatches] = useState([]);
  const [byeBans, setByeBans] = useState({});
  const profiles = usePublicProfiles(league?.playerIds);

  useEffect(() => subscribeToLeague(leagueId, setLeague), [leagueId]);
  useEffect(() => subscribeToLeagueMatches(leagueId, setMatches), [leagueId]);
  useEffect(() => subscribeToByeBans(leagueId, setByeBans), [leagueId]);

  if (league === undefined) return <div className="page-loader"><Spinner size="lg" /></div>;
  if (league === null) return <p>ไม่พบลีคนี้</p>;

  return (
    <div className="page-wide">
      <Link to="/leagues">← ลีคทั้งหมด</Link>
      <h1>{league.name}</h1>
      <p>
        {FORMAT_LABEL[league.format]} ({MATCH_TYPE_LABEL[league.matchType]}) ·{" "}
        <span className={`status-badge status-${STATUS_COLOR[league.status]}`}>{STATUS_LABEL[league.status]}</span>
      </p>
      <p>
        ผู้เล่น: {league.playerIds.length}/{league.size}
      </p>

      <ul className="player-chip-list">
        {league.playerIds.map((uid) => (
          <li key={uid}>{profiles[uid]?.displayName ?? "กำลังโหลด..."}</li>
        ))}
      </ul>

      <LeagueResultsView
        league={league}
        matches={matches}
        profiles={profiles}
        byeBans={byeBans}
        isAdmin={profile?.role === "admin"}
        onCreateTiebreaker={(a, b) => createTiebreakerMatch(leagueId, a, b)}
      />
    </div>
  );
}
