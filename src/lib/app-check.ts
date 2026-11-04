import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken,
} from "firebase/app-check";
import { clientApp } from "./firebase-app";
let appCheck: ReturnType<typeof initializeAppCheck> | undefined;
export async function appCheckToken() {
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (!key) return "";
  appCheck ??= initializeAppCheck(clientApp(), {
    provider: new ReCaptchaEnterpriseProvider(key),
    isTokenAutoRefreshEnabled: true,
  });
  return (await getToken(appCheck)).token;
}
