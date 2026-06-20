const STATUS_LABEL = {
  scheduled: "ยังไม่แข่ง",
  one_submitted: "ส่งผลแล้วฝ่ายเดียว",
  disputed: "สกอร์ไม่ตรง รอแอดมิน",
  approved: "จบแล้ว",
  walkover: "ชนะบาย",
};

export default function MatchListRaw({ matches, profiles }) {
  function nameOf(uid) {
    return profiles?.[uid]?.displayName ?? uid;
  }

  return (
    <div className="match-list-raw">
      <h2>ตารางแข่ง ({matches.length} แมตช์)</h2>
      <ul>
        {matches.map((m) => (
          <li key={m.id}>
            <code>{m.matchCode}</code> — {nameOf(m.players.home)} vs {nameOf(m.players.away)}
            {m.round != null && <> (รอบ {m.round})</>}
            {m.leg != null && <> (นัดที่ {m.leg})</>} — {STATUS_LABEL[m.status]}
          </li>
        ))}
      </ul>
    </div>
  );
}
