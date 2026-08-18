"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import QRCode from "qrcode";

export default function QRPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState("");

  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setFormUrl(url);

    QRCode.toDataURL(url, {
      width: 480,
      margin: 2,
      color: { dark: "#0b0e1a", light: "#ffffffff" },
    }).then(setQrDataUrl);
  }, []);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card p-10 flex flex-col items-center text-center max-w-sm"
      >
        <Image
          src="/logo.png"
          alt="ECHELON"
          width={360}
          height={145}
          className="w-40 h-auto mb-4"
        />
        <h1 className="text-xl font-bold mb-1">Scan to Mark Attendance</h1>
        <p className="text-white/60 text-sm mb-6">ECHELON</p>

        {qrDataUrl ? (
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            src={qrDataUrl}
            alt="Attendance form QR code"
            className="rounded-2xl bg-white p-4 w-64 h-64"
          />
        ) : (
          <div className="w-64 h-64 rounded-2xl bg-white/10 animate-pulse" />
        )}

        <p className="text-white/40 text-xs mt-6 break-all">{formUrl}</p>
      </motion.div>
    </main>
  );
}
