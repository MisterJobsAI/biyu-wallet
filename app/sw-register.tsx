"use client";

import { useEffect } from "react";

export default function SWRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/biyu-sw.js")
      .catch((err) => console.error("SW register failed:", err));
  }, []);

  return null;
}