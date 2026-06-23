import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./config";

export async function uploadProfilePhoto(uid, file) {
  const fileRef = ref(storage, `profilePhotos/${uid}/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export async function uploadMatchPhoto(matchId, file) {
  const fileRef = ref(storage, `matchPhotos/${matchId}/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export async function uploadLeagueImage(leagueId, file) {
  const fileRef = ref(storage, `leagueImages/${leagueId}/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
