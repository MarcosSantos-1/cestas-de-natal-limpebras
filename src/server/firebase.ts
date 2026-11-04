import "server-only";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
export function serverApp() {
  if (getApps().length) return getApps()[0];
  const projectId =
    process.env.FIREBASE_PROJECT_ID || "cesta-de-natal-limpebras";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL,
    privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (
    !process.env.FIRESTORE_EMULATOR_HOST &&
    (!clientEmail || !privateKey) &&
    !process.env.GOOGLE_APPLICATION_CREDENTIALS
  )
    throw new Error("CONFIG: Credenciais privadas do Firebase ausentes.");
  return initializeApp({
    projectId,
    ...(process.env.FIRESTORE_EMULATOR_HOST
      ? {}
      : {
          credential:
            clientEmail && privateKey
              ? cert({ projectId, clientEmail, privateKey })
              : applicationDefault(),
        }),
  });
}
export const database = () => getFirestore(serverApp());
export const authentication = () => getAuth(serverApp());
