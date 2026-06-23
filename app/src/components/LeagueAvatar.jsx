import { Trophy, ListOrdered } from "lucide-react";

export default function LeagueAvatar({ league, size = 40 }) {
  const iconSize = Math.round(size * 0.55);
  const style = { width: size, height: size };

  if (league?.imageURL) {
    return <img src={league.imageURL} alt="" className="league-avatar" style={style} />;
  }

  const Icon = league?.format === "cup" ? Trophy : ListOrdered;
  return (
    <span className="league-avatar league-avatar-fallback" style={style} aria-hidden="true">
      <Icon size={iconSize} strokeWidth={1.5} />
    </span>
  );
}
