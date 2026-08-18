"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { BRANCHES } from "@/lib/branches";

type Step = "form" | "otp" | "success" | "already";

const REDIRECT_URL = "https://www.eitfaridabad.com";

export default function AttendanceForm() {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [mobile, setMobile] = useState("");
  const [branch, setBranch] = useState("");
  const [otp, setOtp] = useState("");

  // Auto-redirect after showing success or already-marked screens.
  useEffect(() => {
    if (step === "success" || step === "already") {
      const timer = setTimeout(() => {
        window.location.href = REDIRECT_URL;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);
  useEffect(() => {
  if (resendCooldown <= 0) return;
  const timer = setInterval(() => {
    setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
  }, 1000);
  return () => clearInterval(timer);
}, [resendCooldown]);



 const handleSendOtp = async () => {
  if (!name || !fatherName || !mobile || !branch) {
    toast.error("Please fill all the fields first.");
    return;
  }
  if (mobile.trim().length < 10) {
    toast.error("Enter a valid mobile number.");
    return;
  }

  setLoading(true);
  try {
    const res = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile }),
    });
    const data = await res.json();

    if (res.status === 409 || data.alreadyMarked) {
      setStep("already");
      return;
    }

    if (!res.ok) throw new Error(data.message);

    toast.success(data.message || "OTP sent!");
    setResendCooldown(30);
    setStep("otp");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to send OTP.");
  } finally {
    setLoading(false);
  }
};


const handleResendOtp = async () => {
  if (resendCooldown > 0) return;

  setLoading(true);
  try {
    const res = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile }),
    });
    const data = await res.json();

    if (res.status === 409 || data.alreadyMarked) {
      setStep("already");
      return;
    }

    if (!res.ok) throw new Error(data.message);

    toast.success("OTP resent!");
    setResendCooldown(30);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to resend OTP.");
  } finally {
    setLoading(false);
  }
};

  const handleVerifyOtp = async () => {
    if (!otp) {
      toast.error("Enter the OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("OTP verified!");
      await submitAttendance(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Incorrect OTP.");
    } finally {
      setLoading(false);
    }
  };

  const submitAttendance = async (verified: boolean) => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, fatherName, mobile, branch, otpVerified: verified }),
      });
      const data = await res.json();

      if (res.status === 409) {
        setStep("already");
        return;
      }
      if (!res.ok) throw new Error(data.message);

      setStep("success");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass-card w-full max-w-md p-8 sm:p-10"
    >
      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35 }}
            className="space-y-5"
          >
            <Field label="Full Name">
              <input
                className="glass-input w-full rounded-xl px-4 py-3"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="Father's Name">
              <input
                className="glass-input w-full rounded-xl px-4 py-3"
                placeholder="Enter father's name"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
              />
            </Field>

            <Field label="Mobile Number">
              <input
                className="glass-input w-full rounded-xl px-4 py-3"
                placeholder="10-digit mobile number"
                type="tel"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              />
            </Field>

            <Field label="Branch">
              <select
                className="glass-input w-full rounded-xl px-4 py-3"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value="" className="bg-[#141428]">Select your branch</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b} className="bg-[#141428]">{b}</option>
                ))}
              </select>
            </Field>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSendOtp}
              disabled={loading}
              className="glass-button w-full rounded-xl py-3 font-semibold mt-2"
            >
              {loading ? "Checking..." : "Verify & Mark Attendance"}
            </motion.button>
          </motion.div>
        )}

       {step === "otp" && (
  <motion.div
    key="otp"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.35 }}
    className="space-y-5"
  >
    <div>
      <h3 className="text-lg font-semibold mb-1">Verify OTP</h3>
      <p className="text-sm text-white/60">We&apos;ve sent a code to {mobile}</p>
    </div>

    <Field label="Enter OTP">
      <input
        className="glass-input w-full rounded-xl px-4 py-3 tracking-[0.5em] text-center"
        placeholder="------"
        maxLength={6}
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
      />
    </Field>

    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleVerifyOtp}
      disabled={loading}
      className="glass-button w-full rounded-xl py-3 font-semibold"
    >
      {loading ? "Verifying..." : "Confirm & Submit"}
    </motion.button>

    <button
      onClick={handleResendOtp}
      disabled={resendCooldown > 0 || loading}
      className="w-full text-sm text-white/60 hover:text-white transition disabled:text-white/30 disabled:hover:text-white/30"
    >
      {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
    </button>

    <button
      onClick={() => setStep("form")}
      className="w-full text-sm text-white/60 hover:text-white transition"
    >
      ← Edit details
    </button>
  </motion.div>
)}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "backOut" }}
            className="text-center space-y-4 py-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-3xl"
            >
              ✓
            </motion.div>
            <h3 className="text-xl font-semibold">Attendance Marked!</h3>
            <p className="text-white/60 text-sm">
              Thanks, {name}. Your attendance has been recorded successfully.
            </p>
            <p className="text-white/40 text-xs">Redirecting, please wait...</p>
          </motion.div>
        )}

        {step === "already" && (
          <motion.div
            key="already"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "backOut" }}
            className="text-center space-y-4 py-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-3xl"
            >
              ✓
            </motion.div>
            <h3 className="text-xl font-semibold">Attendance Already Marked</h3>
            <p className="text-white/60 text-sm">
              This mobile number has already marked attendance.
            </p>
            <p className="text-white/40 text-xs">Redirecting, please wait...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-white/70 mb-1.5">{label}</label>
      {children}
    </div>
  );
}