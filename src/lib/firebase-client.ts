import { getAuth, connectAuthEmulator } from "firebase/auth";
import { clientApp } from "./firebase-app";
let connected = false;
export function clientAuth() {
  const auth = getAuth(clientApp());
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true" && !connected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connected = true;
  }
  return auth;
}
