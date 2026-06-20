import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="page">
      <h1>ไม่พบหน้านี้</h1>
      <Link to="/">กลับหน้าหลัก</Link>
    </div>
  );
}
