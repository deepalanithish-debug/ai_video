"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Logo mark ──────────────────────────────────────────────────────────────────
function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      background: "linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)",
      borderRadius: Math.round(size * 0.28),
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 16px rgba(99,102,241,0.28), inset 0 1px 0 rgba(255,255,255,0.2)",
      flexShrink: 0,
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 16 16" fill="none">
        <path d="M3 2L13 8L3 14V2Z" fill="#08080A" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────────
function Field({
  label, name, type = "text", placeholder, value, onChange,
  autoComplete, error, suffix,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
  autoComplete?: string; error?: string;
  suffix?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          name={name} type={resolvedType} placeholder={placeholder}
          value={value} onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="input-base"
          style={{
            paddingRight: (isPassword || suffix) ? 44 : 14,
            ...(error ? { borderColor: "rgba(248,113,113,0.5)", boxShadow: "0 0 0 3px rgba(248,113,113,0.08)" } : {}),
          }}
        />
        {isPassword && (
          <button
            type="button" onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: 2,
              color: "var(--text-muted)", display: "flex",
            }}
          >
            {show ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
        {suffix && !isPassword && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <span style={{ fontSize: 12, color: "var(--error)", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </span>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof fieldErrors = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed. Try again."); return; }
      router.replace("/");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in" style={{ width: "100%" }}>
      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 36 }}>
        <div className="animate-float">
          <LogoMark size={44} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Welcome back
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Sign in to continue to VydeoAI
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: "rgba(20,20,26,0.8)",
        backdropFilter: "blur(24px)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-xl)",
        padding: "32px",
        boxShadow: "var(--shadow-lg)",
      }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Field
            label="Email" name="email" type="email"
            placeholder="you@company.com"
            value={email} onChange={setEmail}
            autoComplete="email"
            error={fieldErrors.email}
          />
          <Field
            label="Password" name="password" type="password"
            placeholder="••••••••"
            value={password} onChange={setPassword}
            autoComplete="current-password"
            error={fieldErrors.password}
          />

          {/* Remember me + Forgot */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: -4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div
                role="checkbox"
                tabIndex={0}
                aria-checked={rememberMe}
                onClick={() => setRememberMe(!rememberMe)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setRememberMe(!rememberMe);
                  }
                }}
                style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: `1.5px solid ${rememberMe ? "var(--accent)" : "var(--border-strong)"}`,
                  background: rememberMe ? "var(--accent)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {rememberMe && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="#08080A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Remember me</span>
            </label>
            <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
              Forgot password?
            </Link>
          </div>

          {/* Error message */}
          {error && (
            <div className="animate-slide-down" style={{
              background: "var(--error-bg)", border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: "var(--r-md)", padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 13, color: "var(--error)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            className="btn btn-primary btn-lg w-full"
            style={{ marginTop: 4, width: "100%", justifyContent: "center", fontSize: 14, letterSpacing: "0.01em" }}
          >
            {loading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Signing in…
              </>
            ) : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div className="divider-text" style={{ margin: "24px 0" }}>or</div>

        {/* Sign up link */}
        <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
            Create one free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "var(--text-disabled)" }}>
        By continuing, you agree to our{" "}
        <span style={{ color: "var(--text-muted)" }}>Terms</span> &amp;{" "}
        <span style={{ color: "var(--text-muted)" }}>Privacy Policy</span>
      </div>
    </div>
  );
}
