"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chrome } from "lucide-react";

export function SignInForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({
      email: form.email,
      password: form.password,
      callbackURL: "/",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Invalid credentials");
    } else {
      router.push("/");
    }
  }

  async function handleGoogle() {
    await signIn.social({ provider: "google", callbackURL: "/" });
  }

  return (
    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
      <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
      <p className="text-sm text-zinc-400 mb-6">Sign in to your PixelReel account</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">Password</label>
            <Link
              href="/forgot-password"
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs text-zinc-500">
          <span className="bg-zinc-900 px-3">or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
        onClick={handleGoogle}
      >
        <Chrome className="w-4 h-4" />
        Google
      </Button>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-purple-400 hover:text-purple-300 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
