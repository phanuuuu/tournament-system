import { Gamepad2 } from "lucide-react";

export default function EmptyState({ icon: Icon = Gamepad2, title, subtitle, compact = false }) {
  return (
    <div className={`empty-state ${compact ? "empty-state-compact" : ""}`}>
      <span className="empty-state-icon" aria-hidden="true">
        <Icon strokeWidth={1.5} />
      </span>
      <p className="empty-state-title">{title}</p>
      {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
    </div>
  );
}
