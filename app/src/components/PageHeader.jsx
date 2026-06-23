import BackLink from "./BackLink";
import HomeButton from "./HomeButton";

// แถวหัวข้อมาตรฐานทุกหน้า (ยกเว้นหน้าแรกของแต่ละ role) — ฝั่งซ้ายเป็น BackLink เดิม (ถ้าหน้านั้นมี)
// หรือ h1 เปล่า ๆ (ถ้าหน้านั้นไม่มี back link), ฝั่งขวาเป็นปุ่ม action เดิมของหน้า (ถ้ามี) ต่อด้วยปุ่มหน้าหลัก
export default function PageHeader({ backTo, backLabel, title, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-left">{backTo ? <BackLink to={backTo}>{backLabel}</BackLink> : <h1>{title}</h1>}</div>
      <div className="page-header-actions">
        {actions}
        <HomeButton />
      </div>
    </div>
  );
}
