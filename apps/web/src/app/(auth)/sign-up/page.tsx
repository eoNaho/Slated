import type { Metadata } from "next";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Create Account | PixelReel",
  description: "Join PixelReel to track movies, build watchlists, and connect with other film lovers.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
