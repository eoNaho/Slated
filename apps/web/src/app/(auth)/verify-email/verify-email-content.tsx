"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/auth-client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }

    verifyEmail({ query: { token } }).then(({ error }) => {
      if (error) {
        setStatus("error");
        setMessage(error.message || "Verification failed");
      } else {
        setStatus("success");
      }
    });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-sm text-center">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
        <p className="text-zinc-300">Verifying your email...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-sm text-center">
        <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Email verified!</h2>
        <p className="text-sm text-zinc-400 mb-6">Your account is ready. Start exploring.</p>
        <Button asChild className="bg-purple-600 hover:bg-purple-500 text-white">
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-sm text-center">
      <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
        <XCircle className="w-6 h-6 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Verification failed</h2>
      <p className="text-sm text-zinc-400 mb-6">{message}</p>
      <Link
        href="/sign-in"
        className="text-sm text-purple-400 hover:text-purple-300"
      >
        Back to sign in
      </Link>
    </div>
  );
}

