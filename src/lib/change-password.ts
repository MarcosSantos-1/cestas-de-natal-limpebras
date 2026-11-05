import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { clientAuth } from "./firebase-client";

export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
  confirmation: string,
) {
  if (newPassword.length < 10 || newPassword.length > 128)
    throw new Error("Use uma senha de 10 a 128 caracteres.");
  if (newPassword !== confirmation)
    throw new Error("As novas senhas não conferem.");
  if (newPassword === currentPassword)
    throw new Error("Escolha uma senha diferente da atual.");
  const user = clientAuth().currentUser;
  if (!user?.email)
    throw new Error(
      "Entre novamente com seu e-mail ou matrícula para alterar a senha.",
    );
  try {
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, currentPassword),
    );
    await updatePassword(user, newPassword);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (
      [
        "auth/wrong-password",
        "auth/invalid-credential",
        "auth/invalid-login-credentials",
      ].includes(code)
    )
      throw new Error("A senha atual está incorreta.");
    if (
      code === "auth/weak-password" ||
      code === "auth/password-does-not-meet-requirements"
    )
      throw new Error(
        "A nova senha não atende aos requisitos do Firebase. Escolha uma senha mais forte.",
      );
    if (code === "auth/too-many-requests")
      throw new Error(
        "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      );
    if (code === "auth/network-request-failed")
      throw new Error("Confira sua conexão e tente novamente.");
    if (
      [
        "auth/requires-recent-login",
        "auth/user-token-expired",
        "auth/user-disabled",
      ].includes(code)
    )
      throw new Error("Entre novamente para confirmar a alteração da senha.");
    throw new Error("Não foi possível alterar a senha agora. Tente novamente.");
  }
}
