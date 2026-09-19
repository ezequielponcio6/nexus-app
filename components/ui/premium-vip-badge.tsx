"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

function isVipActive(plan: string | null, status: string | null) {
  const normalizedPlan = (plan || status || "").toLowerCase();
  return normalizedPlan === "vip pro" || normalizedPlan === "pro" || normalizedPlan === "active";
}

export function PremiumVipBadge({ className = "", active: forcedActive }: { className?: string; active?: boolean }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const syncVipState = () => {
      try {
        const plan = localStorage.getItem("nexus_vip_plan");
        const status = localStorage.getItem("nexus_vip_status");
        setActive(isVipActive(plan, status));
      } catch {
        setActive(false);
      }
    };

    if (typeof forcedActive === "boolean") {
      setActive(forcedActive);
    } else {
      syncVipState();
    }
    if (typeof forcedActive !== "boolean") {
      window.addEventListener("storage", syncVipState);
    }
    return () => window.removeEventListener("storage", syncVipState);
  }, [forcedActive]);

  if (!active) {
    return null;
  }

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-600 px-2 py-0.5 shadow-[0_0_18px_rgba(251,191,36,0.35)] animate-pulse align-middle",
        className,
      ].join(" ")}
      aria-label="Usuário VIP PRO"
      title="Usuário VIP PRO"
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-amber-950 drop-shadow-sm" />
      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-950">VIP PRO</span>
    </span>
  );
}
