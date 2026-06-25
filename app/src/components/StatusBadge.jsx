const STATUS_CONFIG = {
  scheduled: { label: "ยังไม่แข่ง", color: "gray" },
  one_submitted: { label: "ส่งผลแล้วฝ่ายเดียว", color: "yellow", pulse: true },
  disputed: { label: "สกอร์ไม่ตรง", color: "orange", pulse: true },
  approved: { label: "จบแล้ว", color: "green" },
  walkover: { label: "ชนะบาย", color: "green" },
};

// pulse เบา ๆ เฉพาะสถานะที่ "รออะไรบางอย่างอยู่" (รออีกฝั่งส่ง/รอแอดมินตัดสิน) — สถานะจบแล้วนิ่ง ไม่ขยับต่อ
export default function StatusBadge({ status, children }) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: "gray" };
  return (
    <span className={`status-badge status-${config.color} ${config.pulse ? "status-badge-pulse" : ""}`}>
      {children ?? config.label}
    </span>
  );
}
