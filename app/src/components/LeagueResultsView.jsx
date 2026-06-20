import { useState } from "react";
import { computeStandings } from "../utils/standings";
import StandingsTable from "./StandingsTable";
import BracketView from "./BracketView";
import MatchListRaw from "./MatchListRaw";

export default function LeagueResultsView({ league, matches, profiles, byeBans, isAdmin, onCreateTiebreaker }) {
  const [showRaw, setShowRaw] = useState(false);

  if (matches.length === 0) return null;

  return (
    <div>
      {league.format === "points" ? (
        <StandingsTable
          standings={computeStandings(league.playerIds, matches, byeBans)}
          profiles={profiles}
          isAdmin={isAdmin}
          onCreateTiebreaker={onCreateTiebreaker}
        />
      ) : (
        <BracketView matches={matches} profiles={profiles} currentRound={league.currentRound} />
      )}

      <button type="button" onClick={() => setShowRaw((v) => !v)}>
        {showRaw ? "ซ่อนรายแมตช์ทั้งหมด" : "ดูรายแมตช์ทั้งหมด"}
      </button>
      {showRaw && <MatchListRaw matches={matches} profiles={profiles} />}
    </div>
  );
}
