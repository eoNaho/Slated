"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { resetPassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }
    setLoading(true);
    const { error } = await resetPassword({ newPassword: password, token });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Failed to reset password");
    } else {
      toast.success("Password updated! Please sign in.");
      router.push("/sign-in");
    }
  }

  return (
    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
      <h1 className="text-2xl font-bold text-white mb-1">New password</h1>
      <p className="text-sm text-zinc-400 mb-6">Choose a strong password for your account</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">New password</label>
          <Input
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Confirm password</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-500">
        Remembered it?{" "}
        <Link href="/sign-in" className="text-purple-400 hover:text-purple-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}

