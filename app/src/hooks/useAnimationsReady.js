import { useEffect, useState } from "react";

// สปลาชหน้าแอป (BootSplashGate) ครอบ children ไว้เฉย ๆ (ไม่ unmount) อย่างน้อย ~2.4 วิทุกครั้งที่โหลดหน้าใหม่ —
// ถ้าปล่อยให้อนิเมชันเปิดหน้านับเวลาจาก mount เลย ตอนรีเฟรชหน้าจริง อนิเมชันจะเล่นจบไปแล้วทั้งที่ยังโดนสปลาชบังอยู่
// ผู้ใช้จะไม่เห็นเลย hook นี้รอให้ .splash-screen หายไปจาก DOM ก่อน (หรือเริ่มทันทีถ้าไม่มีสปลาชอยู่แล้ว เช่นกดลิงก์ในแอป)
export default function useAnimationsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!document.querySelector(".splash-screen")) {
      const raf = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(raf);
    }
    const observer = new MutationObserver(() => {
      if (!document.querySelector(".splash-screen")) {
        setReady(true);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return ready;
}
