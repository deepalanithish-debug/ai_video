"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Password strength ───────────────────────────────────────────────────────
function getPasswordStrength(password: string): {
  score: number; // 0-4
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const map: Array<{ label: string; color: string }> = [
    { label: "Weak", color: "#ef4444" },
    { label: "Fair", color: "#f97316" },
    { label: "Good", color: "#eab308" },
    { label: "Strong", color: "#22c55e" },
    { label: "Strong", color: "#22c55e" },
  ];
  return { score, ...map[score] };
}

// ─── Inline styles ────────────────────────────────────────────────────────────
const S = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#07071a",
    fontFamily: '"Inter", system-ui, sans-serif',
    WebkitFontSmoothing: "antialiased",
    overflow: "hidden",
  } as React.CSSProperties,

  // ── Left panel ─────────────────────────────────────────────────────────────
  left: {
    width: "55%",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #07071a 0%, #0f0828 40%, #07071a 100%)",
  } as React.CSSProperties,

  leftInner: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "24px",
    padding: "0 64px",
    maxWidth: "520px",
    width: "100%",
  } as React.CSSProperties,

  brandLogo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
  } as React.CSSProperties,

  brandIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    boxShadow: "0 0 24px rgba(124,58,237,0.6)",
  } as React.CSSProperties,

  brandName: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#f1f1f6",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  tagline: {
    fontSize: "36px",
    fontWeight: 700,
    lineHeight: 1.2,
    color: "#f1f1f6",
    letterSpacing: "-0.03em",
  } as React.CSSProperties,

  taglineAccent: {
    background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  } as React.CSSProperties,

  taglineSub: {
    fontSize: "15px",
    color: "rgba(241,241,246,0.5)",
    lineHeight: 1.6,
    marginTop: "-8px",
  } as React.CSSProperties,

  featureGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
    marginTop: "8px",
  } as React.CSSProperties,

  featureChip: (color: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 18px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.04)",
    border: `1px solid rgba(255,255,255,0.07)`,
    backdropFilter: "blur(12px)",
    transition: "all 0.25s ease",
    cursor: "default",
  }),

  featureChipDot: (color: string): React.CSSProperties => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: color,
    boxShadow: `0 0 10px ${color}`,
    flexShrink: 0,
  }),

  featureChipText: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#f1f1f6",
  } as React.CSSProperties,

  featureChipBadge: (color: string): React.CSSProperties => ({
    marginLeft: "auto",
    fontSize: "11px",
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: "20px",
    background: `${color}22`,
    color: color,
    letterSpacing: "0.05em",
  }),

  // ── Orbs ───────────────────────────────────────────────────────────────────
  orb: (
    size: number,
    color: string,
    top: string,
    left: string,
    delay: string
  ): React.CSSProperties => ({
    position: "absolute",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    top,
    left,
    opacity: 0.35,
    filter: "blur(40px)",
    animation: `float 8s ease-in-out infinite`,
    animationDelay: delay,
    pointerEvents: "none",
  }),

  // ── Right panel ────────────────────────────────────────────────────────────
  right: {
    width: "45%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 48px",
    overflowY: "auto",
    background:
      "linear-gradient(160deg, rgba(124,58,237,0.06) 0%, transparent 50%)",
  } as React.CSSProperties,

  card: {
    width: "100%",
    maxWidth: "440px",
    animation: "fadeSlideIn 0.6s ease forwards",
  } as React.CSSProperties,

  heading: {
    fontSize: "30px",
    fontWeight: 700,
    letterSpacing: "-0.03em",
    lineHeight: 1.15,
    background: "linear-gradient(90deg, #f1f1f6 30%, #7c3aed 70%, #06b6d4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    marginBottom: "6px",
  } as React.CSSProperties,

  subheading: {
    fontSize: "14px",
    color: "rgba(241,241,246,0.5)",
    marginBottom: "32px",
  } as React.CSSProperties,

  // ── Form ───────────────────────────────────────────────────────────────────
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  } as React.CSSProperties,

  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  } as React.CSSProperties,

  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  } as React.CSSProperties,

  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "rgba(241,241,246,0.6)",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  } as React.CSSProperties,

  inputWrap: {
    position: "relative",
  } as React.CSSProperties,

  input: (focused: boolean, hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "12px 14px",
    background: "#0d0d2e",
    border: `1px solid ${
      hasError
        ? "#ef4444"
        : focused
        ? "rgba(124,58,237,0.7)"
        : "rgba(255,255,255,0.08)"
    }`,
    borderRadius: "10px",
    fontSize: "14px",
    color: "#f1f1f6",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxShadow: focused
      ? hasError
        ? "0 0 0 3px rgba(239,68,68,0.15)"
        : "0 0 0 3px rgba(124,58,237,0.2), 0 0 16px rgba(124,58,237,0.1)"
      : "none",
  }),

  eyeBtn: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "rgba(241,241,246,0.4)",
    fontSize: "16px",
    padding: "4px",
    lineHeight: 1,
    transition: "color 0.2s",
  } as React.CSSProperties,

  // ── Strength bar ──────────────────────────────────────────────────────────
  strengthWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    marginTop: "2px",
  } as React.CSSProperties,

  strengthBar: {
    display: "flex",
    gap: "4px",
    height: "3px",
  } as React.CSSProperties,

  strengthSeg: (filled: boolean, color: string): React.CSSProperties => ({
    flex: 1,
    borderRadius: "4px",
    background: filled ? color : "rgba(255,255,255,0.08)",
    transition: "background 0.3s ease",
  }),

  strengthLabel: (color: string): React.CSSProperties => ({
    fontSize: "11px",
    color: color,
    fontWeight: 500,
    letterSpacing: "0.04em",
  }),

  // ── Checkbox ──────────────────────────────────────────────────────────────
  checkRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    marginTop: "2px",
  } as React.CSSProperties,

  checkBox: (checked: boolean): React.CSSProperties => ({
    width: "18px",
    height: "18px",
    borderRadius: "5px",
    border: `2px solid ${checked ? "#7c3aed" : "rgba(255,255,255,0.15)"}`,
    background: checked
      ? "linear-gradient(135deg, #7c3aed, #06b6d4)"
      : "transparent",
    flexShrink: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    marginTop: "1px",
  }),

  checkLabel: {
    fontSize: "13px",
    color: "rgba(241,241,246,0.55)",
    lineHeight: 1.5,
  } as React.CSSProperties,

  checkLink: {
    color: "#7c3aed",
    textDecoration: "none",
    fontWeight: 500,
  } as React.CSSProperties,

  // ── Submit button ─────────────────────────────────────────────────────────
  submitBtn: (loading: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: loading
      ? "rgba(124,58,237,0.4)"
      : "linear-gradient(90deg, #7c3aed 0%, #06b6d4 100%)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    letterSpacing: "0.02em",
    cursor: loading ? "not-allowed" : "pointer",
    position: "relative",
    overflow: "hidden",
    transition: "transform 0.15s, box-shadow 0.15s, opacity 0.15s",
    boxShadow: loading
      ? "none"
      : "0 4px 24px rgba(124,58,237,0.45), 0 2px 8px rgba(6,182,212,0.2)",
    opacity: loading ? 0.7 : 1,
    marginTop: "4px",
  }),

  // ── Error banner ──────────────────────────────────────────────────────────
  errorBanner: {
    padding: "12px 16px",
    borderRadius: "10px",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#f87171",
    fontSize: "13px",
    fontWeight: 500,
    animation: "shake 0.4s ease",
  } as React.CSSProperties,

  // ── Footer link ───────────────────────────────────────────────────────────
  footerText: {
    textAlign: "center" as const,
    fontSize: "13px",
    color: "rgba(241,241,246,0.4)",
    marginTop: "24px",
  } as React.CSSProperties,

  footerLink: {
    color: "#7c3aed",
    textDecoration: "none",
    fontWeight: 600,
    transition: "color 0.2s",
  } as React.CSSProperties,

  spinner: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    marginRight: "8px",
    verticalAlign: "middle",
  } as React.CSSProperties,
};

// ─── Features data ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    label: "AI Video Generation",
    badge: "Core",
    color: "#7c3aed",
    icon: "✦",
  },
  {
    label: "Brand Kits",
    badge: "Brand",
    color: "#06b6d4",
    icon: "✦",
  },
  {
    label: "Smart Text Studio",
    badge: "Studio",
    color: "#c9a96e",
    icon: "✦",
  },
  {
    label: "Unlimited Drafts",
    badge: "Unlimited",
    color: "#a855f7",
    icon: "✦",
  },
  {
    label: "Vibe AI Assistant",
    badge: "AI",
    color: "#06b6d4",
    icon: "✦",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Focus tracking
  const [focused, setFocused] = useState<Record<string, boolean>>({});
  const onFocus = useCallback(
    (k: string) => setFocused((p) => ({ ...p, [k]: true })),
    []
  );
  const onBlur = useCallback(
    (k: string) => setFocused((p) => ({ ...p, [k]: false })),
    []
  );

  const strength = password ? getPasswordStrength(password) : null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "Required";
    if (!lastName.trim()) errs.lastName = "Required";
    if (!email.trim()) {
      errs.email = "Required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Invalid email";
    }
    if (!password) {
      errs.password = "Required";
    } else if (password.length < 8) {
      errs.password = "At least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      errs.password = "Must contain an uppercase letter";
    } else if (!/[0-9]/.test(password)) {
      errs.password = "Must contain a number";
    }
    if (!confirmPassword) {
      errs.confirmPassword = "Required";
    } else if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    if (!agreed) errs.terms = "You must accept the Terms of Service";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!validate()) return;

      setLoading(true);
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || data?.message || "Signup failed. Please try again.");
        }
        router.push("/");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [firstName, lastName, email, password, confirmPassword, agreed, router]
  );

  return (
    <>
      {/* ── Keyframes injected via style tag ─────────────────────────────── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          33%       { transform: translateY(-28px) scale(1.04); }
          66%       { transform: translateY(16px) scale(0.97); }
        }
        @keyframes shimmer {
          0%   { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
          50%      { box-shadow: 0 0 0 5px rgba(124,58,237,0.3); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes orbitDot {
          from { transform: rotate(0deg) translateX(40px); }
          to   { transform: rotate(360deg) translateX(40px); }
        }
        .signup-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(124,58,237,0.55), 0 4px 12px rgba(6,182,212,0.3) !important;
        }
        .signup-submit-btn:active:not(:disabled) {
          transform: translateY(0px);
        }
        .signup-submit-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.12) 50%,
            transparent 100%
          );
          background-size: 200px 100%;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .signup-submit-btn:hover::after {
          opacity: 1;
          animation: shimmer 1s ease infinite;
        }
        .feature-chip:hover {
          background: rgba(255,255,255,0.07) !important;
          transform: translateX(4px);
        }
        .signup-footer-link:hover {
          color: #06b6d4 !important;
        }
        .eye-btn:hover {
          color: rgba(241,241,246,0.8) !important;
        }
        input::placeholder {
          color: rgba(241,241,246,0.2);
        }
      `}</style>

      <div style={S.page}>
        {/* ════════════ LEFT PANEL ════════════ */}
        <div style={S.left}>
          {/* Animated orbs */}
          <div style={S.orb(500, "#7c3aed", "-10%", "-8%", "0s")} />
          <div style={S.orb(380, "#06b6d4", "55%", "60%", "2.5s")} />
          <div style={S.orb(280, "#c9a96e", "30%", "30%", "4s")} />
          <div style={S.orb(200, "#a855f7", "80%", "10%", "1.5s")} />
          <div style={S.orb(160, "#06b6d4", "5%", "70%", "3.2s")} />

          {/* Subtle grid overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />

          {/* Content */}
          <div style={S.leftInner}>
            {/* Brand */}
            <div style={S.brandLogo}>
              <div style={S.brandIcon}>🎬</div>
              <span style={S.brandName}>VydeoAI</span>
            </div>

            {/* Tagline */}
            <div>
              <div style={S.tagline}>
                Create Videos{" "}
                <span style={S.taglineAccent}>Faster with AI</span>
              </div>
              <p style={S.taglineSub}>
                From concept to export in minutes — powered by the most
                advanced AI video pipeline.
              </p>
            </div>

            {/* Feature chips */}
            <div style={S.featureGrid}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "rgba(241,241,246,0.3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "2px",
                }}
              >
                What&apos;s included
              </div>
              {FEATURES.map((f) => (
                <div
                  key={f.label}
                  className="feature-chip"
                  style={S.featureChip(f.color)}
                >
                  <div style={S.featureChipDot(f.color)} />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "rgba(241,241,246,0.4)",
                      marginRight: "2px",
                    }}
                  >
                    {f.icon}
                  </span>
                  <span style={S.featureChipText}>{f.label}</span>
                  <span style={S.featureChipBadge(f.color)}>{f.badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════ RIGHT PANEL ════════════ */}
        <div style={S.right}>
          <div style={S.card}>
            <h1 style={S.heading}>Create your account</h1>
            <p style={S.subheading}>
              Start building stunning videos with AI
            </p>

            <form style={S.form} onSubmit={handleSubmit} noValidate>
              {/* Error banner */}
              {error && <div style={S.errorBanner}>{error}</div>}

              {/* First + Last name row */}
              <div style={S.row}>
                {/* First name */}
                <div style={S.fieldGroup}>
                  <label style={S.label}>First Name</label>
                  <div style={S.inputWrap}>
                    <input
                      type="text"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onFocus={() => onFocus("firstName")}
                      onBlur={() => onBlur("firstName")}
                      style={S.input(
                        !!focused.firstName,
                        !!fieldErrors.firstName
                      )}
                      autoComplete="given-name"
                    />
                  </div>
                  {fieldErrors.firstName && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#f87171",
                        marginTop: "2px",
                      }}
                    >
                      {fieldErrors.firstName}
                    </span>
                  )}
                </div>

                {/* Last name */}
                <div style={S.fieldGroup}>
                  <label style={S.label}>Last Name</label>
                  <div style={S.inputWrap}>
                    <input
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onFocus={() => onFocus("lastName")}
                      onBlur={() => onBlur("lastName")}
                      style={S.input(
                        !!focused.lastName,
                        !!fieldErrors.lastName
                      )}
                      autoComplete="family-name"
                    />
                  </div>
                  {fieldErrors.lastName && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#f87171",
                        marginTop: "2px",
                      }}
                    >
                      {fieldErrors.lastName}
                    </span>
                  )}
                </div>
              </div>

              {/* Email */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Email</label>
                <div style={S.inputWrap}>
                  <input
                    type="email"
                    placeholder="jane@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => onFocus("email")}
                    onBlur={() => onBlur("email")}
                    style={S.input(!!focused.email, !!fieldErrors.email)}
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#f87171",
                      marginTop: "2px",
                    }}
                  >
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* Password */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Password</label>
                <div style={S.inputWrap}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => onFocus("password")}
                    onBlur={() => onBlur("password")}
                    style={{
                      ...S.input(!!focused.password, !!fieldErrors.password),
                      paddingRight: "42px",
                    }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    style={S.eyeBtn}
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>

                {/* Strength indicator */}
                {password && strength && (
                  <div style={S.strengthWrap}>
                    <div style={S.strengthBar}>
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          style={S.strengthSeg(
                            i < strength.score,
                            strength.color
                          )}
                        />
                      ))}
                    </div>
                    <span style={S.strengthLabel(strength.color)}>
                      {strength.label}
                    </span>
                  </div>
                )}

                {fieldErrors.password && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#f87171",
                      marginTop: "2px",
                    }}
                  >
                    {fieldErrors.password}
                  </span>
                )}
              </div>

              {/* Confirm password */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Confirm Password</label>
                <div style={S.inputWrap}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => onFocus("confirmPassword")}
                    onBlur={() => onBlur("confirmPassword")}
                    style={{
                      ...S.input(
                        !!focused.confirmPassword,
                        !!fieldErrors.confirmPassword
                      ),
                      paddingRight: "42px",
                    }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    style={S.eyeBtn}
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirm ? "🙈" : "👁"}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#f87171",
                      marginTop: "2px",
                    }}
                  >
                    {fieldErrors.confirmPassword}
                  </span>
                )}
              </div>

              {/* Terms checkbox */}
              <div>
                <div
                  style={S.checkRow}
                  onClick={() => setAgreed((v) => !v)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") &&
                    setAgreed((v) => !v)
                  }
                  aria-checked={agreed}
                >
                  <div style={S.checkBox(agreed)}>
                    {agreed && (
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 10 8"
                        fill="none"
                      >
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span style={S.checkLabel}>
                    I agree to the{" "}
                    <a
                      href="/terms"
                      style={S.checkLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      style={S.checkLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Privacy Policy
                    </a>
                  </span>
                </div>
                {fieldErrors.terms && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#f87171",
                      display: "block",
                      marginTop: "6px",
                      marginLeft: "28px",
                    }}
                  >
                    {fieldErrors.terms}
                  </span>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="signup-submit-btn"
                style={S.submitBtn(loading)}
                disabled={loading}
              >
                {loading && <span style={S.spinner} />}
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            {/* Footer */}
            <p style={S.footerText}>
              Already have an account?{" "}
              <a
                href="/login"
                className="signup-footer-link"
                style={S.footerLink}
              >
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
