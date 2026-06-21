import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import SplashScreen from "./SplashScreen";

const MIN_SHOW_MS = 700;
const SLOW_WARNING_MS = 4000;
const MAX_TIMEOUT_MS = 9000;
const FADE_DURATION_MS = 380;

// ครอบทั้งแอป คอย Firebase Auth resolve ครั้งแรกตอนเปิดแอป (ไม่แก้ logic การ auth ใด ๆ แค่อ่าน loading)
export default function BootSplashGate({ children }) {
  const { loading } = useAuth();
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const [slow, setSlow] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const slowTimer = setTimeout(() => setSlow(true), SLOW_WARNING_MS);
    const maxTimer = setTimeout(() => setTimedOut(true), MAX_TIMEOUT_MS);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const elapsed = Date.now() - startRef.current;
    const remaining = Math.max(0, MIN_SHOW_MS - elapsed);
    const t = setTimeout(() => setFadingOut(true), remaining);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (!fadingOut) return;
    const t = setTimeout(() => setVisible(false), FADE_DURATION_MS);
    return () => clearTimeout(t);
  }, [fadingOut]);

  const phase = fadingOut ? "fade" : timedOut ? "error" : slow ? "slow" : "boot";

  return (
    <>
      {children}
      {visible && <SplashScreen phase={phase} onRetry={() => window.location.reload()} />}
    </>
  );
}
