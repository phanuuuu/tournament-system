import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

export async function createUserProfile(uid, { displayName, phone, facebookName, facebookUrl, lineId, photoURL }) {
  await setDoc(doc(db, "users", uid), {
    displayName,
    phone,
    facebookName,
    facebookUrl: facebookUrl || null,
    lineId: lineId || null,
    photoURL: photoURL || null,
    role: "player",
    createdAt: serverTimestamp(),
  });
}

export async function updateUserProfile(uid, { displayName, phone, facebookName, facebookUrl, lineId, photoURL }) {
  await updateDoc(doc(db, "users", uid), {
    displayName,
    phone,
    facebookName,
    facebookUrl: facebookUrl || null,
    lineId: lineId || null,
    photoURL: photoURL || null,
  });
}
