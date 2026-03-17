import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password | PixelReel",
  description: "Request a password reset link for your PixelReel account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
