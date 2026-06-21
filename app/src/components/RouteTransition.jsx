import { Outlet, useLocation } from "react-router-dom";

// เปลี่ยนหน้าแล้ว fade/slide เบา ๆ — key เปลี่ยนตาม path ทำให้ React mount node ใหม่ทุกครั้ง
// แอนิเมชัน entrance ของ CSS เลยเล่นใหม่อัตโนมัติ ไม่ต้องจัดการ state เพิ่ม
export default function RouteTransition() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="route-transition">
      <Outlet />
    </div>
  );
}
