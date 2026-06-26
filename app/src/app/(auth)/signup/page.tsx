"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

function Field({
  label, name, type = "text", placeholder, value, onChange,
  autoComplete, error, hint,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
  autoComplete?: string; error?: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          name={name} type={isPassword ? (show ? "text" : "password") : type}
          placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)} autoComplete={autoComplete}
          className="input-base"
          style={{
            paddingRight: isPassword ? 44 : 14,
            ...(error ? { borderColor: "rgba(248,113,113,0.5)", boxShadow: "0 0 0 3px rgba(248,113,113,0.08)" } : {}),
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {show ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </>
              )}
            </svg>
          </button>
        )}
      </div>
      {hint && !error && <span style={{ fontSize: 11, color: "var(--text-disabled)" }}>{hint}</span>}
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

// Password strength meter
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#f87171", "#fb923c", "#fbbf24", "#34d399"];

  if (!password) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: -8 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= score ? colors[score] : "var(--bg-overlay)",
            transition: "background 0.2s ease",
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "First name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Minimum 8 characters";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(), password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Signup failed. Try again."); return; }
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <LogoMark size={44} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Start creating for free
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Join thousands of creators using VydeoAI
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: "rgba(20,20,26,0.8)", backdropFilter: "blur(24px)",
        border: "1px solid var(--border)", borderRadius: "var(--r-xl)",
        padding: "32px", boxShadow: "var(--shadow-lg)",
      }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="First name" name="firstName" placeholder="Alex"
              value={firstName} onChange={setFirstName} autoComplete="given-name" error={fieldErrors.firstName} />
            <Field label="Last name" name="lastName" placeholder="Johnson"
              value={lastName} onChange={setLastName} autoComplete="family-name" />
          </div>

          <Field label="Email" name="email" type="email" placeholder="you@company.com"
            value={email} onChange={setEmail} autoComplete="email" error={fieldErrors.email} />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Field label="Password" name="password" type="password" placeholder="Create a strong password"
              value={password} onChange={v => { setPassword(v); setFieldErrors(p => ({ ...p, password: "", confirmPassword: "" })); }}
              autoComplete="new-password" error={fieldErrors.password} hint="Minimum 8 characters" />
            <PasswordStrength password={password} />
          </div>

          <Field label="Confirm Password" name="confirmPassword" type="password" placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={v => { setConfirmPassword(v); setFieldErrors(p => ({ ...p, confirmPassword: "" })); }}
            autoComplete="new-password" error={fieldErrors.confirmPassword} />

          {/* Error */}
          {error && (
            <div className="animate-slide-down" style={{
              background: "var(--error-bg)", border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: "var(--r-md)", padding: "10px 14px",
              display: "flex", gap: 8, fontSize: 13, color: "var(--error)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center", fontSize: 14, marginTop: 4 }}>
            {loading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Creating account…
              </>
            ) : "Create free account"}
          </button>
        </form>

        <div className="divider-text" style={{ margin: "24px 0" }}>already have an account</div>

        <Link href="/login" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "100%", padding: "9px 18px", borderRadius: "var(--r-md)",
          border: "1px solid var(--border)", background: "transparent",
          color: "var(--text-secondary)", fontSize: 13, fontWeight: 500,
          textDecoration: "none", transition: "all 0.15s ease",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
          Sign in instead
        </Link>
      </div>

      <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--text-disabled)" }}>
        By creating an account, you agree to our{" "}
        <span style={{ color: "var(--text-muted)" }}>Terms of Service</span> &amp;{" "}
        <span style={{ color: "var(--text-muted)" }}>Privacy Policy</span>
      </div>
    </div>
  );
}
