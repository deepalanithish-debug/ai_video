"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ msg: string; type: "no-account" | "wrong-password" | "generic" } | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, rememberMe }),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg: string = data?.error ?? "Something went wrong. Please try again.";
          if (msg.toLowerCase().includes("no account") || msg.toLowerCase().includes("not found")) {
            setError({ msg, type: "no-account" });
          } else if (msg.toLowerCase().includes("incorrect") || msg.toLowerCase().includes("password")) {
            setError({ msg, type: "wrong-password" });
          } else {
            setError({ msg, type: "generic" });
          }
        } else {
          router.push("/");
        }
      } catch {
        setError({ msg: "Network error. Please check your connection and try again.", type: "generic" });
      } finally {
        setLoading(false);
      }
    },
    [email, password, rememberMe, router]
  );

  return (
    <>
      <style>{`
        @keyframes float {
          0%   { transform: translateY(0px) translateX(0px) scale(1); }
          33%  { transform: translateY(-40px) translateX(20px) scale(1.05); }
          66%  { transform: translateY(20px) translateX(-15px) scale(0.97); }
          100% { transform: translateY(0px) translateX(0px) scale(1); }
        }
        @keyframes floatAlt {
          0%   { transform: translateY(0px) translateX(0px) scale(1); }
          25%  { transform: translateY(30px) translateX(-25px) scale(1.08); }
          75%  { transform: translateY(-25px) translateX(30px) scale(0.95); }
          100% { transform: translateY(0px) translateX(0px) scale(1); }
        }
        @keyframes floatSlow {
          0%   { transform: translateY(0px) translateX(0px) scale(1) rotate(0deg); }
          50%  { transform: translateY(-60px) translateX(40px) scale(1.1) rotate(10deg); }
          100% { transform: translateY(0px) translateX(0px) scale(1) rotate(0deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-10px); }
          30%       { transform: translateX(10px); }
          45%       { transform: translateX(-8px); }
          60%       { transform: translateX(8px); }
          75%       { transform: translateX(-5px); }
          90%       { transform: translateX(5px); }
        }
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeSlideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.15); opacity: 0.9; }
        }
        .orb-purple {
          animation: float 12s ease-in-out infinite, orbPulse 6s ease-in-out infinite;
        }
        .orb-cyan {
          animation: floatAlt 15s ease-in-out infinite, orbPulse 8s ease-in-out 2s infinite;
        }
        .orb-gold {
          animation: floatSlow 20s ease-in-out infinite, orbPulse 10s ease-in-out 4s infinite;
        }
        .orb-mini-1 {
          animation: floatAlt 9s ease-in-out infinite;
        }
        .orb-mini-2 {
          animation: float 11s ease-in-out 3s infinite;
        }
        .orb-mini-3 {
          animation: floatSlow 14s ease-in-out 6s infinite;
        }
        .login-card {
          animation: fadeSlideIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .left-panel-content {
          animation: fadeSlideInLeft 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }
        .gradient-btn {
          background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
          background-size: 200% 200%;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background-position 0.4s ease;
        }
        .gradient-btn:hover {
          background-position: right center;
          box-shadow: 0 0 30px rgba(124, 58, 237, 0.6), 0 0 60px rgba(6, 182, 212, 0.3);
          transform: translateY(-2px) scale(1.015);
        }
        .gradient-btn:active {
          transform: translateY(0) scale(0.99);
        }
        .shimmer-overlay {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.18) 40%,
            rgba(255,255,255,0.35) 50%,
            rgba(255,255,255,0.18) 60%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.8s ease-in-out infinite;
        }
        .error-box {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        .brand-gradient {
          background: linear-gradient(
            135deg,
            #c9a96e 0%,
            #7c3aed 30%,
            #06b6d4 65%,
            #7c3aed 85%,
            #c9a96e 100%
          );
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 5s ease infinite;
        }
        .tagline-gradient {
          background: linear-gradient(90deg, #7c3aed, #06b6d4, #c9a96e);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s ease infinite;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0d0d2e inset !important;
          -webkit-text-fill-color: #f1f1f6 !important;
          caret-color: #f1f1f6;
        }
      `}</style>

      {/* Root container */}
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
          background: "linear-gradient(135deg, #07071a 0%, #0f0f2d 100%)",
          fontFamily: '"Inter", system-ui, sans-serif',
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {/* ─── Left Panel: Animated Background ─── */}
        <div
          style={{
            position: "relative",
            flex: "0 0 60%",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #07071a 0%, #0c0c28 40%, #0a0a20 100%)",
          }}
        >
          {/* Grid overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
              zIndex: 1,
            }}
          />

          {/* Radial vignette */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 40%, #07071a 100%)",
              zIndex: 2,
            }}
          />

          {/* Orb: Large Purple */}
          <div
            className="orb-purple"
            style={{
              position: "absolute",
              top: "15%",
              left: "20%",
              width: 420,
              height: 420,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 40% 40%, rgba(124,58,237,0.55) 0%, rgba(124,58,237,0.25) 45%, transparent 70%)",
              filter: "blur(55px)",
              zIndex: 0,
            }}
          />

          {/* Orb: Large Cyan */}
          <div
            className="orb-cyan"
            style={{
              position: "absolute",
              bottom: "20%",
              right: "10%",
              width: 380,
              height: 380,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 60% 60%, rgba(6,182,212,0.5) 0%, rgba(6,182,212,0.2) 50%, transparent 72%)",
              filter: "blur(60px)",
              zIndex: 0,
            }}
          />

          {/* Orb: Gold accent */}
          <div
            className="orb-gold"
            style={{
              position: "absolute",
              top: "55%",
              left: "5%",
              width: 260,
              height: 260,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 50% 50%, rgba(201,169,110,0.45) 0%, rgba(201,169,110,0.15) 55%, transparent 75%)",
              filter: "blur(45px)",
              zIndex: 0,
            }}
          />

          {/* Orb: secondary purple (top right) */}
          <div
            className="orb-mini-1"
            style={{
              position: "absolute",
              top: "5%",
              right: "5%",
              width: 180,
              height: 180,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)",
              filter: "blur(35px)",
              zIndex: 0,
            }}
          />

          {/* Orb: mini cyan (bottom left) */}
          <div
            className="orb-mini-2"
            style={{
              position: "absolute",
              bottom: "8%",
              left: "15%",
              width: 150,
              height: 150,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(6,182,212,0.35) 0%, transparent 70%)",
              filter: "blur(30px)",
              zIndex: 0,
            }}
          />

          {/* Orb: tiny gold (center) */}
          <div
            className="orb-mini-3"
            style={{
              position: "absolute",
              top: "42%",
              right: "28%",
              width: 100,
              height: 100,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(201,169,110,0.5) 0%, transparent 70%)",
              filter: "blur(20px)",
              zIndex: 0,
            }}
          />

          {/* Inner glow ring — top center */}
          <div
            style={{
              position: "absolute",
              top: "-80px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 500,
              height: 300,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(124,58,237,0.2) 0%, transparent 65%)",
              filter: "blur(40px)",
              zIndex: 0,
            }}
          />

          {/* Left-panel branding content */}
          <div
            className="left-panel-content"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              padding: "60px 56px",
            }}
          >
            {/* Brand badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 18px",
                borderRadius: 100,
                border: "1px solid rgba(124,58,237,0.35)",
                background: "rgba(124,58,237,0.1)",
                backdropFilter: "blur(12px)",
                marginBottom: 36,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#06b6d4",
                  boxShadow: "0 0 8px #06b6d4",
                  animation: "pulseGlow 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(241,241,246,0.7)",
                }}
              >
                AI-Powered Video Studio
              </span>
            </div>

            {/* Hero headline */}
            <h1
              style={{
                fontSize: "clamp(2.4rem, 4vw, 3.8rem)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                margin: "0 0 20px 0",
                maxWidth: 520,
              }}
            >
              <span style={{ color: "#f1f1f6" }}>Transform ideas into</span>
              <br />
              <span className="brand-gradient">cinematic reality.</span>
            </h1>

            <p
              style={{
                fontSize: "1.05rem",
                fontWeight: 400,
                lineHeight: 1.7,
                color: "rgba(241,241,246,0.5)",
                maxWidth: 440,
                margin: "0 0 52px 0",
              }}
            >
              Professional AI video editing that understands your vision — from
              raw footage to polished, publish-ready content in minutes.
            </p>

            {/* Feature pills */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { icon: "⚡", label: "Agentic timeline generation", color: "#7c3aed" },
                { icon: "🎬", label: "Smart scene transitions", color: "#06b6d4" },
                { icon: "✨", label: "One-click brand consistency", color: "#c9a96e" },
              ].map(({ icon, label, color }) => (
                <div
                  key={label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: `${color}22`,
                      border: `1px solid ${color}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "rgba(241,241,246,0.65)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right-edge gradient fade into form panel */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 160,
              height: "100%",
              background:
                "linear-gradient(to right, transparent, #07071a)",
              zIndex: 11,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* ─── Right Panel: Login Form ─── */}
        <div
          style={{
            flex: "0 0 40%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#07071a",
            padding: "40px 32px",
            position: "relative",
            overflowY: "auto",
          }}
        >
          {/* Subtle top glow in form panel */}
          <div
            style={{
              position: "absolute",
              top: -60,
              left: "50%",
              transform: "translateX(-50%)",
              width: 340,
              height: 240,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          {/* Form card */}
          <div
            className="login-card"
            style={{
              width: "100%",
              maxWidth: 400,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: 20,
              padding: "42px 38px",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 0 0 1px rgba(6,182,212,0.06), 0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* VydeoAI logo */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                {/* Logo icon */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 16px rgba(124,58,237,0.5)",
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <polygon
                      points="4,3 15,9 4,15"
                      fill="white"
                      opacity="0.95"
                    />
                  </svg>
                </div>
                <span
                  className="brand-gradient"
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                  }}
                >
                  VydeoAI
                </span>
              </div>
              <p
                className="tagline-gradient"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                Create. Edit. Elevate.
              </p>
            </div>

            {/* Divider */}
            <div
              style={{
                height: 1,
                background:
                  "linear-gradient(to right, transparent, rgba(124,58,237,0.3), rgba(6,182,212,0.3), transparent)",
                marginBottom: 28,
              }}
            />

            {/* Heading */}
            <div style={{ marginBottom: 28 }}>
              <h2
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "1.45rem",
                  fontWeight: 700,
                  color: "#f1f1f6",
                  letterSpacing: "-0.02em",
                }}
              >
                Welcome back
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.875rem",
                  color: "rgba(241,241,246,0.45)",
                  fontWeight: 400,
                }}
              >
                Sign in to your VydeoAI workspace
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="error-box"
                style={{
                  marginBottom: 20,
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.35)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  animation: "shake 0.45s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="7" stroke="#f87171" strokeWidth="1.5" />
                    <path d="M8 5v3.5M8 11h.01" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 13, color: "#f87171", fontWeight: 600, lineHeight: 1.5 }}>
                    {error.msg}
                  </span>
                </div>
                {error.type === "no-account" && (
                  <div style={{ fontSize: 12, color: "rgba(248,113,113,0.8)", paddingLeft: 26 }}>
                    Don&apos;t have an account?{" "}
                    <a href="/signup" style={{ color: "#a78bfa", fontWeight: 600, textDecoration: "none" }}>
                      Sign up for free →
                    </a>
                  </div>
                )}
                {error.type === "wrong-password" && (
                  <div style={{ fontSize: 12, color: "rgba(248,113,113,0.8)", paddingLeft: 26 }}>
                    Forgot your password?{" "}
                    <button
                      type="button"
                      onClick={() => { const el = document.getElementById("forgot-link"); if (el) el.click(); }}
                      style={{ background: "none", border: "none", color: "#a78bfa", fontWeight: 600, fontSize: 12, cursor: "pointer", padding: 0 }}
                    >
                      Click here to reset it →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Email field */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label
                  htmlFor="email"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(241,241,246,0.6)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Email
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    style={{
                      width: "100%",
                      padding: "13px 16px 13px 42px",
                      background: "#0d0d2e",
                      border: emailFocused
                        ? "1px solid #7c3aed"
                        : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      color: "#f1f1f6",
                      fontSize: 14,
                      fontWeight: 400,
                      outline: "none",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                      boxShadow: emailFocused
                        ? "0 0 0 3px rgba(124,58,237,0.18), 0 0 20px rgba(124,58,237,0.12)"
                        : "none",
                      fontFamily: '"Inter", system-ui, sans-serif',
                    }}
                  />
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      opacity: emailFocused ? 0.85 : 0.4,
                      transition: "opacity 0.2s ease",
                      pointerEvents: "none",
                    }}
                  >
                    <path
                      d="M2 4a1 1 0 011-1h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
                      stroke={emailFocused ? "#7c3aed" : "#f1f1f6"}
                      strokeWidth="1.3"
                    />
                    <path
                      d="M2 4l6 5 6-5"
                      stroke={emailFocused ? "#7c3aed" : "#f1f1f6"}
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Password field */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label
                  htmlFor="password"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(241,241,246,0.6)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    style={{
                      width: "100%",
                      padding: "13px 44px 13px 42px",
                      background: "#0d0d2e",
                      border: passwordFocused
                        ? "1px solid #06b6d4"
                        : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      color: "#f1f1f6",
                      fontSize: 14,
                      fontWeight: 400,
                      outline: "none",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                      boxShadow: passwordFocused
                        ? "0 0 0 3px rgba(6,182,212,0.18), 0 0 20px rgba(6,182,212,0.1)"
                        : "none",
                      fontFamily: '"Inter", system-ui, sans-serif',
                    }}
                  />
                  {/* Lock icon */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      opacity: passwordFocused ? 0.85 : 0.4,
                      transition: "opacity 0.2s ease",
                      pointerEvents: "none",
                    }}
                  >
                    <rect
                      x="3"
                      y="7"
                      width="10"
                      height="8"
                      rx="2"
                      stroke={passwordFocused ? "#06b6d4" : "#f1f1f6"}
                      strokeWidth="1.3"
                    />
                    <path
                      d="M5 7V5a3 3 0 016 0v2"
                      stroke={passwordFocused ? "#06b6d4" : "#f1f1f6"}
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Show/hide toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      opacity: 0.45,
                      transition: "opacity 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.opacity = "0.85")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.opacity = "0.45")
                    }
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                        <path
                          d="M1 8.5C1 8.5 3.5 3 8.5 3s7.5 5.5 7.5 5.5-2.5 5.5-7.5 5.5S1 8.5 1 8.5z"
                          stroke="#f1f1f6"
                          strokeWidth="1.4"
                        />
                        <circle cx="8.5" cy="8.5" r="2.2" stroke="#f1f1f6" strokeWidth="1.4" />
                        <line x1="2" y1="2" x2="15" y2="15" stroke="#f1f1f6" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                        <path
                          d="M1 8.5C1 8.5 3.5 3 8.5 3s7.5 5.5 7.5 5.5-2.5 5.5-7.5 5.5S1 8.5 1 8.5z"
                          stroke="#f1f1f6"
                          strokeWidth="1.4"
                        />
                        <circle cx="8.5" cy="8.5" r="2.2" stroke="#f1f1f6" strokeWidth="1.4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: 18,
                      height: 18,
                      flexShrink: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{
                        position: "absolute",
                        opacity: 0,
                        width: "100%",
                        height: "100%",
                        cursor: "pointer",
                        margin: 0,
                      }}
                    />
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: rememberMe
                          ? "1.5px solid #7c3aed"
                          : "1.5px solid rgba(255,255,255,0.2)",
                        background: rememberMe
                          ? "linear-gradient(135deg, #7c3aed, #06b6d4)"
                          : "#0d0d2e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                        boxShadow: rememberMe
                          ? "0 0 10px rgba(124,58,237,0.4)"
                          : "none",
                        pointerEvents: "none",
                      }}
                    >
                      {rememberMe && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path
                            d="M2 5l2.5 2.5L8 3"
                            stroke="white"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      color: "rgba(241,241,246,0.55)",
                      fontWeight: 400,
                    }}
                  >
                    Remember me
                  </span>
                </label>

                <a
                  id="forgot-link"
                  href="/forgot-password"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#7c3aed",
                    textDecoration: "none",
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color = "#06b6d4")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color = "#7c3aed")
                  }
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit button */}
              <div style={{ marginTop: 6 }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="gradient-btn"
                  onMouseEnter={() => setBtnHovered(true)}
                  onMouseLeave={() => setBtnHovered(false)}
                  style={{
                    position: "relative",
                    width: "100%",
                    padding: "14px 24px",
                    borderRadius: 12,
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: "0.01em",
                    color: "#fff",
                    overflow: "hidden",
                    fontFamily: '"Inter", system-ui, sans-serif',
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {/* Shimmer overlay on hover */}
                  {btnHovered && !loading && (
                    <div
                      className="shimmer-overlay"
                      style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        borderRadius: 12,
                      }}
                    />
                  )}

                  <span
                    style={{
                      position: "relative",
                      zIndex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    {loading ? (
                      <>
                        <div
                          style={{
                            width: 17,
                            height: 17,
                            borderRadius: "50%",
                            border: "2px solid rgba(255,255,255,0.35)",
                            borderTopColor: "#fff",
                            animation: "spin 0.7s linear infinite",
                          }}
                        />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M3 8h10M9 4l4 4-4 4"
                            stroke="white"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Divider OR */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  margin: "4px 0",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: "rgba(255,255,255,0.08)",
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(241,241,246,0.3)",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                  }}
                >
                  or
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: "rgba(255,255,255,0.08)",
                  }}
                />
              </div>

              {/* Sign up link */}
              <p
                style={{
                  textAlign: "center",
                  margin: 0,
                  fontSize: 13.5,
                  color: "rgba(241,241,246,0.45)",
                }}
              >
                Don&apos;t have an account?{" "}
                <a
                  href="/signup"
                  style={{
                    color: "#06b6d4",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color = "#7c3aed")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color = "#06b6d4")
                  }
                >
                  Sign up free
                </a>
              </p>
            </form>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 28,
              textAlign: "center",
              zIndex: 1,
            }}
          >
            <p
              style={{
                fontSize: 11.5,
                color: "rgba(241,241,246,0.2)",
                margin: 0,
                letterSpacing: "0.03em",
              }}
            >
              &copy; 2026 VydeoAI &mdash; All rights reserved
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
