import { getApps, initializeApp } from "firebase/app";
const config = {
  apiKey: "AIzaSyAXjNzRacMBB9fQg4Zr6xLgrj9e9oJVYPQ",
  authDomain: "cesta-de-natal-limpebras.firebaseapp.com",
  projectId: "cesta-de-natal-limpebras",
  storageBucket: "cesta-de-natal-limpebras.firebasestorage.app",
  messagingSenderId: "1061487630656",
  appId: "1:1061487630656:web:ffeb9deab3fd48d3e002a5",
};
export function clientApp() {
  return (
    getApps()[0] ||
    initializeApp(
      process.env.NEXT_PUBLIC_USE_EMULATORS === "true"
        ? { ...config, projectId: "demo-cestas" }
        : config,
    )
  );
}
