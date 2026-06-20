import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export function usePublicProfiles(uids) {
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    const idsToFetch = (uids || []).filter((uid) => !profiles[uid]);
    if (idsToFetch.length === 0) return;

    let cancelled = false;
    Promise.all(
      idsToFetch.map(async (uid) => {
        const snap = await getDoc(doc(db, "publicProfiles", uid));
        return [uid, snap.exists() ? snap.data() : { displayName: "(ไม่พบผู้ใช้)" }];
      })
    ).then((entries) => {
      if (cancelled) return;
      setProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(uids)]);

  return profiles;
}
