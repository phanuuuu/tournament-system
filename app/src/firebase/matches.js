import {
  collection,
  doc,
  writeBatch,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { randomMatchCode } from "../utils/matchCode";

const BATCH_CHUNK_SIZE = 400;

async function generateUniqueMatchCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomMatchCode();
    const q = query(collection(db, "matches"), where("matchCode", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) return code;
  }
  throw new Error("สร้างรหัสแมตช์ไม่สำเร็จ ลองใหม่อีกครั้ง");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function baseMatchFields(leagueId, extra) {
  return {
    leagueId,
    kind: "regular",
    round: null,
    slot: null,
    leg: null,
    matchCode: null,
    status: "scheduled",
    submissions: {},
    submissionHistory: [],
    approvedResult: null,
    walkover: null,
    contactUnreachable: {},
    createdAt: serverTimestamp(),
    ...extra,
  };
}

async function commitInChunks(operations) {
  for (let i = 0; i < operations.length; i += BATCH_CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const { ref, data } of operations.slice(i, i + BATCH_CHUNK_SIZE)) {
      batch.set(ref, data);
    }
    await batch.commit();
  }
}

export async function generateCupRound1(leagueId, playerIds) {
  const shuffled = shuffle(playerIds);
  const operations = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    const matchCode = await generateUniqueMatchCode();
    operations.push({
      ref: doc(collection(db, "matches")),
      data: baseMatchFields(leagueId, {
        round: 1,
        slot: i / 2,
        players: { home: shuffled[i], away: shuffled[i + 1] },
        matchCode,
      }),
    });
  }

  await commitInChunks(operations);
}

export async function generatePointsSchedule(leagueId, playerIds, matchType) {
  const operations = [];

  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const code1 = await generateUniqueMatchCode();
      operations.push({
        ref: doc(collection(db, "matches")),
        data: baseMatchFields(leagueId, {
          leg: matchType === "homeAway" ? 1 : null,
          players: { home: playerIds[i], away: playerIds[j] },
          matchCode: code1,
        }),
      });

      if (matchType === "homeAway") {
        const code2 = await generateUniqueMatchCode();
        operations.push({
          ref: doc(collection(db, "matches")),
          data: baseMatchFields(leagueId, {
            leg: 2,
            players: { home: playerIds[j], away: playerIds[i] },
            matchCode: code2,
          }),
        });
      }
    }
  }

  await commitInChunks(operations);
}

export function subscribeToLeagueMatches(leagueId, callback) {
  const q = query(collection(db, "matches"), where("leagueId", "==", leagueId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeToMatch(matchId, callback) {
  return onSnapshot(doc(db, "matches", matchId), (snap) => {
    if (!snap.exists() && snap.metadata.fromCache) return;
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function subscribeToDisputedMatches(callback) {
  const q = query(collection(db, "matches"), where("status", "==", "disputed"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function findMatchByCode(code) {
  const q = query(collection(db, "matches"), where("matchCode", "==", code.trim().toUpperCase()));
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// แมตช์ตัดสินอันดับลีคเก็บแต้มตอนเท่ากันเป๊ะทุกตัวตัดสิน — ใช้กติกาถ้วย (เสมอ → จุดโทษ)
// ไม่มีผลต่อ ได้/เสีย/แต้มในตารางหลัก ใช้แค่จัดลำดับคู่นี้เท่านั้น
export async function createTiebreakerMatch(leagueId, uidA, uidB) {
  const matchCode = await generateUniqueMatchCode();
  await writeBatch(db)
    .set(
      doc(collection(db, "matches")),
      baseMatchFields(leagueId, {
        kind: "tiebreaker",
        players: { home: uidA, away: uidB },
        matchCode,
      })
    )
    .commit();
}
