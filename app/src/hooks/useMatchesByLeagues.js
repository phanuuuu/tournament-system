import { useEffect, useState } from "react";
import { subscribeToLeagueMatches } from "../firebase/matches";

export function useMatchesByLeagues(leagueIds) {
  const [byLeague, setByLeague] = useState({});

  useEffect(() => {
    const unsubs = leagueIds.map((id) => subscribeToLeagueMatches(id, (matches) => {
      setByLeague((prev) => ({ ...prev, [id]: matches }));
    }));
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(leagueIds)]);

  return byLeague;
}
