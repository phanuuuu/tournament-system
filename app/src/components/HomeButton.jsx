import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export default function HomeButton() {
  return (
    <Link to="/" className="home-button" aria-label="หน้าหลัก">
      <Home size={18} aria-hidden="true" />
      <span className="home-button-label">หน้าหลัก</span>
    </Link>
  );
}
