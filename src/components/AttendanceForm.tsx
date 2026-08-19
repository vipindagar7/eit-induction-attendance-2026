"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { BRANCHES } from "@/lib/branches";
import { RELATIONS } from "@/lib/relations";
import { STATIONS } from "@/lib/stations";

type Step = "form" | "otp" | "success" | "already";

interface Member {
  name: string;
  relation: string;
}

interface FormErrors {
  name?: boolean;
  fatherName?: boolean;
  mobile?: boolean;
  branch?: boolean;
  isComing?: boolean;
  comingAlone?: boolean;
  members?: number[];
  wantsTransport?: boolean;
  transportStation?: boolean;
}

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

  const [isComing, setIsComing] = useState<boolean | null>(null);
  const [comingAlone, setComingAlone] = useState<boolean | null>(null);
  const [memberCountInput, setMemberCountInput] = useState("1");
  const [members, setMembers] = useState<Member[]>([{ name: "", relation: "" }]);

  const [wantsTransport, setWantsTransport] = useState<boolean | null>(null);
  const [transportStation, setTransportStation] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});

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

  const handleMemberCountChange = (raw: string) => {
    setMemberCountInput(raw);
    const parsed = parseInt(raw, 10);
    if (!raw || isNaN(parsed) || parsed < 1) {
      return;
    }
    setMembers((prev) => {
      const next = [...prev];
      while (next.length < parsed) next.push({ name: "", relation: "" });
      while (next.length > parsed) next.pop();
      return next;
    });
  };

  const handleMemberCountBlur = () => {
    const parsed = parseInt(memberCountInput, 10);
    if (!memberCountInput || isNaN(parsed) || parsed < 1) {
      setMemberCountInput("1");
      setMembers((prev) => (prev.length === 0 ? [{ name: "", relation: "" }] : prev.slice(0, 1)));
    }
  };

  const updateMember = (index: number, field: keyof Member, value: string) => {
    setMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) newErrors.name = true;
    if (!fatherName.trim()) newErrors.fatherName = true;
    if (!mobile.trim() || mobile.trim().length < 10) newErrors.mobile = true;
    if (!branch) newErrors.branch = true;
    if (isComing === null) newErrors.isComing = true;

    if (isComing) {
      if (comingAlone === null) newErrors.comingAlone = true;
      if (comingAlone === false) {
        const invalidIdx = members
          .map((m, idx) => (!m.name.trim() || !m.relation.trim() ? idx : -1))
          .filter((idx) => idx !== -1);
        if (invalidIdx.length > 0) newErrors.members = invalidIdx;
      }

      if (wantsTransport === null) newErrors.wantsTransport = true;
      if (wantsTransport === true && !transportStation) newErrors.transportStation = true;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fill in the highlighted fields.");
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateForm()) return;

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
        body: JSON.stringify({
          name,
          fatherName,
          mobile,
          branch,
          otpVerified: verified,
          isComing,
          comingAlone: isComing ? comingAlone : null,
          members: isComing && !comingAlone ? members : [],
          wantsTransport: isComing ? wantsTransport : false,
          transportStation: isComing && wantsTransport ? transportStation : null,
        }),
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

  const errorRing = "ring-2 ring-red-500/70";

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
            className="space-y-5 max-h-[70vh] overflow-y-auto pr-1"
          >
            <Field label="Full Name">
              <input
                className={`glass-input w-full rounded-xl px-4 py-3 ${errors.name ? errorRing : ""}`}
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((p) => ({ ...p, name: false }));
                }}
              />
              {errors.name && <ErrorText text="Name is required" />}
            </Field>

            <Field label="Father's Name">
              <input
                className={`glass-input w-full rounded-xl px-4 py-3 ${errors.fatherName ? errorRing : ""}`}
                placeholder="Enter father's name"
                value={fatherName}
                onChange={(e) => {
                  setFatherName(e.target.value);
                  if (errors.fatherName) setErrors((p) => ({ ...p, fatherName: false }));
                }}
              />
              {errors.fatherName && <ErrorText text="Father's name is required" />}
            </Field>

            <Field label="Mobile Number">
              <input
                className={`glass-input w-full rounded-xl px-4 py-3 ${errors.mobile ? errorRing : ""}`}
                placeholder="10-digit mobile number"
                type="tel"
                maxLength={10}
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value.replace(/\D/g, ""));
                  if (errors.mobile) setErrors((p) => ({ ...p, mobile: false }));
                }}
              />
              {errors.mobile && <ErrorText text="Valid 10-digit mobile number is required" />}
            </Field>

            <Field label="Branch">
              <select
                className={`glass-input w-full rounded-xl px-4 py-3 ${errors.branch ? errorRing : ""}`}
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  if (errors.branch) setErrors((p) => ({ ...p, branch: false }));
                }}
              >
                <option value="" className="bg-[#141428]">Select your branch</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b} className="bg-[#141428]">{b}</option>
                ))}
              </select>
              {errors.branch && <ErrorText text="Please select a branch" />}
            </Field>

            <Field label="Are you coming for Orientation on 23 August 2026?">
              <div className={`flex gap-3 rounded-xl ${errors.isComing ? errorRing : ""}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsComing(true);
                    setErrors((p) => ({ ...p, isComing: false }));
                  }}
                  className={`flex-1 rounded-xl py-2.5 font-medium transition ${
                    isComing === true ? "glass-button" : "glass-input"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsComing(false);
                    setComingAlone(null);
                    setWantsTransport(null);
                    setTransportStation("");
                    setErrors((p) => ({
                      ...p,
                      isComing: false,
                      comingAlone: false,
                      members: undefined,
                      wantsTransport: false,
                      transportStation: false,
                    }));
                  }}
                  className={`flex-1 rounded-xl py-2.5 font-medium transition ${
                    isComing === false ? "glass-button" : "glass-input"
                  }`}
                >
                  No
                </button>
              </div>
              {errors.isComing && <ErrorText text="Please answer whether you're coming" />}
            </Field>

            <AnimatePresence>
              {isComing === true && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden space-y-5"
                >
                  <Field label="Are you coming alone or with someone?">
                    <div className={`flex gap-3 rounded-xl ${errors.comingAlone ? errorRing : ""}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setComingAlone(true);
                          setErrors((p) => ({ ...p, comingAlone: false, members: undefined }));
                        }}
                        className={`flex-1 rounded-xl py-2.5 font-medium transition ${
                          comingAlone === true ? "glass-button" : "glass-input"
                        }`}
                      >
                        Alone
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComingAlone(false);
                          setErrors((p) => ({ ...p, comingAlone: false }));
                        }}
                        className={`flex-1 rounded-xl py-2.5 font-medium transition ${
                          comingAlone === false ? "glass-button" : "glass-input"
                        }`}
                      >
                        With Someone
                      </button>
                    </div>
                    {errors.comingAlone && <ErrorText text="Please answer whether you're coming alone" />}
                  </Field>

                  <Field label="Do you want transport?">
                    <div className={`flex gap-3 rounded-xl ${errors.wantsTransport ? errorRing : ""}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setWantsTransport(true);
                          setErrors((p) => ({ ...p, wantsTransport: false }));
                        }}
                        className={`flex-1 rounded-xl py-2.5 font-medium transition ${
                          wantsTransport === true ? "glass-button" : "glass-input"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWantsTransport(false);
                          setTransportStation("");
                          setErrors((p) => ({ ...p, wantsTransport: false, transportStation: false }));
                        }}
                        className={`flex-1 rounded-xl py-2.5 font-medium transition ${
                          wantsTransport === false ? "glass-button" : "glass-input"
                        }`}
                      >
                        No
                      </button>
                    </div>
                    {errors.wantsTransport && <ErrorText text="Please answer whether you need transport" />}
                  </Field>

                  <AnimatePresence>
                    {wantsTransport === true && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <Field label="Select your nearest metro station">
                          <select
                            className={`glass-input w-full rounded-xl px-4 py-3 ${
                              errors.transportStation ? errorRing : ""
                            }`}
                            value={transportStation}
                            onChange={(e) => {
                              setTransportStation(e.target.value);
                              if (errors.transportStation) {
                                setErrors((p) => ({ ...p, transportStation: false }));
                              }
                            }}
                          >
                            <option value="" className="bg-[#141428]">Select a station</option>
                            {STATIONS.map((s) => (
                              <option key={s} value={s} className="bg-[#141428]">{s}</option>
                            ))}
                          </select>
                          {errors.transportStation && <ErrorText text="Please select a station" />}
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {comingAlone === false && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 overflow-hidden"
                      >
                        <Field label="How many people are with you?">
                          <input
                            type="number"
                            min={1}
                            className="glass-input w-full rounded-xl px-4 py-3"
                            value={memberCountInput}
                            onChange={(e) => handleMemberCountChange(e.target.value)}
                            onBlur={handleMemberCountBlur}
                          />
                        </Field>

                        <div className="space-y-3">
                          {members.map((member, idx) => {
                            const isInvalid = errors.members?.includes(idx);
                            return (
                              <div
                                key={idx}
                                className={`glass-input rounded-xl p-3 space-y-2 ${isInvalid ? errorRing : ""}`}
                              >
                                <p className="text-xs text-white/50">Person {idx + 1}</p>
                                <input
                                  className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                                  placeholder="Name"
                                  value={member.name}
                                  onChange={(e) => {
                                    updateMember(idx, "name", e.target.value);
                                    if (isInvalid) {
                                      setErrors((p) => ({
                                        ...p,
                                        members: p.members?.filter((i) => i !== idx),
                                      }));
                                    }
                                  }}
                                />
                                <select
                                  className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                                  value={member.relation}
                                  onChange={(e) => {
                                    updateMember(idx, "relation", e.target.value);
                                    if (isInvalid) {
                                      setErrors((p) => ({
                                        ...p,
                                        members: p.members?.filter((i) => i !== idx),
                                      }));
                                    }
                                  }}
                                >
                                  <option value="" className="bg-[#141428]">Select relation</option>
                                  {RELATIONS.map((r) => (
                                    <option key={r} value={r} className="bg-[#141428]">{r}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                        {errors.members && errors.members.length > 0 && (
                          <ErrorText text="Please fill in name and relation for everyone highlighted" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

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
              This mobile number has already marked attendance today.
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

function ErrorText({ text }: { text: string }) {
  return <p className="text-red-400 text-xs mt-1.5">{text}</p>;
}