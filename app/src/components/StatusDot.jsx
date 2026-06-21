const COLOR_BY_STATUS = {
  scheduled: "gray",
  one_submitted: "yellow",
  disputed: "orange",
  approved: "green",
  walkover: "green",
};

// จุดสถานะเล็ก ๆ ใช้แทน/คู่กับ StatusBadge เวลาต้องการแค่สัญลักษณ์สี ไม่ต้องมีข้อความ
export default function StatusDot({ status, color }) {
  const resolved = color ?? COLOR_BY_STATUS[status] ?? "gray";
  return <span className={`status-dot status-dot-${resolved}`} aria-hidden="true" />;
}
