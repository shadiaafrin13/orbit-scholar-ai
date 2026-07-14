import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Compass, Eye, EyeOff, Loader2, Mail } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["login", "signup", "forgot"]).optional().default("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Atlas" },
      { name: "description", content: "Access your Atlas profile — AI-powered study abroad, scholarships, and research." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(254);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);
const nameSchema = z.string().trim().min(2, "Enter your full name").max(80);

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup" | "forgot">(mode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => setTab(mode), [mode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const parsed = z.object({ fullName: nameSchema, email: emailSchema, password: passwordSchema })
          .safeParse({ fullName, email, password });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: parsed.data.fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm.");
      } else if (tab === "login") {
        const parsed = z.object({ email: emailSchema, password: z.string().min(1, "Password required") })
          .safeParse({ email, password });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Welcome back to Atlas.");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const parsed = emailSchema.safeParse(email);
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset email sent — check your inbox.");
        setTab("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  const title = tab === "signup" ? "Start your Atlas" : tab === "forgot" ? "Reset your password" : "Welcome back";
  const subtitle = tab === "signup" ? "One profile. Every module. AI-powered."
    : tab === "forgot" ? "Enter your email and we'll send a reset link."
    : "Continue your academic journey.";

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-nebula glow">
            <Compass className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">Atlas</span>
        </Link>

        <div className="glass rounded-3xl p-8">
          {tab !== "forgot" && (
            <div className="mb-6 flex rounded-full bg-secondary p-1 text-sm">
              <button type="button" onClick={() => setTab("login")}
                className={`flex-1 rounded-full px-4 py-2 transition ${tab === "login" ? "bg-nebula text-primary-foreground" : "text-muted-foreground"}`}>
                Sign in
              </button>
              <button type="button" onClick={() => setTab("signup")}
                className={`flex-1 rounded-full px-4 py-2 transition ${tab === "signup" ? "bg-nebula text-primary-foreground" : "text-muted-foreground"}`}>
                Create account
              </button>
            </div>
          )}

          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

          {tab !== "forgot" && (
            <>
              <button onClick={handleGoogle} disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-background/40 py-2.5 text-sm font-medium transition hover:bg-secondary disabled:opacity-50">
                <GoogleIcon /> Continue with Google
              </button>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />or email<div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === "signup" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full name</label>
                <input type="text" required autoComplete="name" value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Aditi Sharma" />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="you@university.edu" />
            </div>
            {tab !== "forgot" && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-medium text-muted-foreground">Password</label>
                  {tab === "login" && (
                    <button type="button" onClick={() => setTab("forgot")}
                      className="text-xs text-primary hover:underline">Forgot?</button>
                  )}
                </div>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} required minLength={tab === "signup" ? 8 : 1}
                    autoComplete={tab === "signup" ? "new-password" : "current-password"}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 pr-10 text-sm outline-none focus:border-primary"
                    placeholder={tab === "signup" ? "At least 8 characters" : "••••••••"} />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-nebula py-2.5 text-sm font-semibold text-primary-foreground glow disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (tab === "forgot" ? <Mail className="h-4 w-4" /> : null)}
              {tab === "login" ? "Sign in" : tab === "signup" ? "Create account" : "Send reset link"}
            </button>
            {tab === "forgot" && (
              <button type="button" onClick={() => setTab("login")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
                ← Back to sign in
              </button>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.3 14.7 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 12s4.1 9.7 9.2 9.7c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.5H12z"/>
    </svg>
  );
}
