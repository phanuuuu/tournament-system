const STATUS_CONFIG = {
  scheduled: { label: "ยังไม่แข่ง", color: "gray" },
  one_submitted: { label: "ส่งผลแล้วฝ่ายเดียว", color: "yellow" },
  disputed: { label: "สกอร์ไม่ตรง", color: "orange" },
  approved: { label: "จบแล้ว", color: "green" },
  walkover: { label: "ชนะบาย", color: "green" },
};

export default function StatusBadge({ status, children }) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: "gray" };
  return <span className={`status-badge status-${config.color}`}>{children ?? config.label}</span>;
}
