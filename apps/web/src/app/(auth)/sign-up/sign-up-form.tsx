"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chrome } from "lucide-react";
import { signIn } from "@/lib/auth-client";

export function SignUpForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { error } = await signUp.email({
      name: form.name,
      email: form.email,
      password: form.password,
      username: form.username,
      callbackURL: "/",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Could not create account");
    } else {
      toast.success("Check your email to verify your account!");
      router.push("/sign-in");
    }
  }

  async function handleGoogle() {
    await signIn.social({ provider: "google", callbackURL: "/" });
  }

  return (
    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
      <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
      <p className="text-sm text-zinc-400 mb-6">Join PixelReel and start tracking</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Name</label>
            <Input
              placeholder="John Doe"
              value={form.name}
              onChange={set("name")}
              required
              className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Username</label>
            <Input
              placeholder="johndoe"
              value={form.username}
              onChange={set("username")}
              required
              pattern="[a-z0-9_]+"
              title="Lowercase letters, numbers and underscores only"
              className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set("email")}
            required
            className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Password</label>
          <Input
            type="password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={set("password")}
            required
            minLength={8}
            className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white"
          size="lg"
        >
          {loading ? "Creating account..." : "Create Account"}
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
        Already have an account?{" "}
        <Link href="/sign-in" className="text-purple-400 hover:text-purple-300 font-medium">
          Sign in
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-zinc-600">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="text-zinc-500 hover:text-zinc-400 underline">Terms</Link>
        {" "}and{" "}
        <Link href="/privacy" className="text-zinc-500 hover:text-zinc-400 underline">Privacy Policy</Link>
      </p>
    </div>
  );
}
