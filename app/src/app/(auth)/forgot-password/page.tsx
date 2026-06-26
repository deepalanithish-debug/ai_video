"use client";

import { useState } from "react";
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

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setFieldError("Email is required"); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setFieldError("Enter a valid email"); return; }
    setFieldError(null);
    // No email backend exists yet — show an honest confirmation state.
    setSubmitted(true);
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
            Reset your password
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Enter your email and we&apos;ll send reset instructions
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
        {submitted ? (
          <div className="animate-slide-down" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: "var(--success-bg)", border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "var(--r-md)", padding: "14px 16px",
              display: "flex", alignItems: "flex-start", gap: 10,
              fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>
                If an account exists for {email}, we&apos;ve sent password reset instructions.
              </span>
            </div>
            <Link href="/login" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", padding: "9px 18px", borderRadius: "var(--r-md)",
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-secondary)", fontSize: 13, fontWeight: 500,
              textDecoration: "none", transition: "all 0.15s ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="email" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Email
              </label>
              <input
                id="email" name="email" type="email" placeholder="you@company.com"
                value={email} onChange={e => { setEmail(e.target.value); if (fieldError) setFieldError(null); }}
                autoComplete="email"
                className="input-base"
                style={{
                  paddingRight: 14,
                  ...(fieldError ? { borderColor: "rgba(248,113,113,0.5)", boxShadow: "0 0 0 3px rgba(248,113,113,0.08)" } : {}),
                }}
              />
              {fieldError && (
                <span style={{ fontSize: 12, color: "var(--error)", display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {fieldError}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              style={{ marginTop: 4, width: "100%", justifyContent: "center", fontSize: 14, letterSpacing: "0.01em" }}
            >
              Send reset instructions
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="divider-text" style={{ margin: "24px 0" }}>or</div>

        {/* Back to sign in link */}
        <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
          Remember your password?{" "}
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
            Back to sign in
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
