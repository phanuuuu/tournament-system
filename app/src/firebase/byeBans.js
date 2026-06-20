import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./config";

export function subscribeToByeBans(leagueId, callback) {
  return onSnapshot(collection(db, "leagues", leagueId, "byeBans"), (snap) => {
    const map = {};
    snap.docs.forEach((d) => {
      map[d.id] = d.data();
    });
    callback(map);
  });
}
