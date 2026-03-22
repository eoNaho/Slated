import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login — PixelReel Command",
  description: "Acesso restrito a administradores da plataforma PixelReel.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
