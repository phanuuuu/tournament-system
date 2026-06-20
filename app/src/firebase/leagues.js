import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "./config";

export function subscribeToLeagues(callback) {
  const q = query(collection(db, "leagues"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeToLeague(leagueId, callback) {
  return onSnapshot(doc(db, "leagues", leagueId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function isValidCupSize(n) {
  return Number.isInteger(n) && n >= 4 && (Math.log2(n) % 1 === 0);
}

export function isValidPointsSize(n) {
  return Number.isInteger(n) && n >= 2 && n % 2 === 0;
}

export function isValidLeagueSize(format, n) {
  return format === "cup" ? isValidCupSize(n) : isValidPointsSize(n);
}

export function canStartLeague(league) {
  if (!league || league.status !== "open") return false;
  const count = league.playerIds?.length ?? 0;
  if (league.format === "cup") return count === league.size;
  return count >= 2 && count % 2 === 0;
}

export function canDeleteLeague(league) {
  return league?.status === "open" || league?.status === "finished";
}

export async function createLeague(adminUid, { name, format, matchType, size }) {
  return addDoc(collection(db, "leagues"), {
    name,
    format,
    matchType: format === "cup" ? "single" : matchType,
    size,
    status: "open",
    playerIds: [],
    currentRound: null,
    createdAt: serverTimestamp(),
    createdBy: adminUid,
    startedAt: null,
    finishedAt: null,
  });
}

export async function joinLeague(leagueId, uid) {
  await updateDoc(doc(db, "leagues", leagueId), { playerIds: arrayUnion(uid) });
}

export async function leaveLeague(leagueId, uid) {
  await updateDoc(doc(db, "leagues", leagueId), { playerIds: arrayRemove(uid) });
}

export async function kickPlayer(leagueId, uid) {
  await updateDoc(doc(db, "leagues", leagueId), { playerIds: arrayRemove(uid) });
}

export async function startLeague(leagueId) {
  await updateDoc(doc(db, "leagues", leagueId), {
    status: "ongoing",
    startedAt: serverTimestamp(),
  });
}

export async function deleteLeague(leagueId) {
  await deleteDoc(doc(db, "leagues", leagueId));
}
