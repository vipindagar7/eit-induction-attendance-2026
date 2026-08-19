"use client";

import { useState } from "react";

export default function AdminUploadPage() {
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!password || !file) {
      setStatus("Please enter the password and choose a file.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const formData = new FormData();
      formData.append("secret", password);
      formData.append("file", file);

      const res = await fetch("/api/admin/upload-students", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setStatus("✅ " + data.message);
      setFile(null);
    } catch (err) {
      setStatus("❌ " + (err instanceof Error ? err.message : "Upload failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0e1a",
        color: "#f5f5f7",
        fontFamily: "sans-serif",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 16,
          padding: 32,
          maxWidth: 400,
          width: "100%",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
          Update Registered Student List
        </h1>

        <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
          Admin Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.05)",
            color: "#fff",
            marginBottom: 16,
          }}
        />

        <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
          Select .xlsx file
        </label>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ marginBottom: 20, color: "#fff" }}
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            color: "#fff",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Uploading..." : "Upload & Update List"}
        </button>

        {status && (
          <p style={{ marginTop: 16, fontSize: 14, wordBreak: "break-word" }}>{status}</p>
        )}
      </div>
    </main>
  );
}