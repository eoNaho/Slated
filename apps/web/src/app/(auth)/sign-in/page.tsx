import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign In | PixelReel",
  description: "Sign in to your PixelReel account to track movies and series.",
};

export default function SignInPage() {
  return <SignInForm />;
}
