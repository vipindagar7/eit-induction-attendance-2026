"use client";

import { Toaster } from "react-hot-toast";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: "rgba(20, 20, 30, 0.9)",
          color: "#f5f5f7",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(10px)",
        },
      }}
    />
  );
}
