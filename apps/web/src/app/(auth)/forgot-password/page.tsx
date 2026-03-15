"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { forgetPassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await forgetPassword({
      email,
      redirectTo: "/reset-password",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Something went wrong");
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-sm text-center">
        <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center mx-auto mb-4">
          <MailCheck className="w-6 h-6 text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
        <p className="text-sm text-zinc-400 mb-6">
          We sent a reset link to <span className="text-white">{email}</span>
        </p>
        <Link
          href="/sign-in"
          className="text-sm text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
      <h1 className="text-2xl font-bold text-white mb-1">Reset password</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Enter your email and we&apos;ll send you a reset link
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white"
          size="lg"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>

      <Link
        href="/sign-in"
        className="mt-5 flex items-center justify-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </Link>
    </div>
  );
}
