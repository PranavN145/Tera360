"use client";

import React from "react";
import { Store, TreePine } from "lucide-react";

export type SettlementIconType = "mountain" | "forest" | "bazaar";

/**
 * Derives a semantic terrain/settlement icon category for monitored settlements.
 */
export function getSettlementIconType(
  villageId: string,
  villageName: string
): SettlementIconType {
  const lower = villageName.toLowerCase();
  if (
    lower.includes("bazaar") ||
    lower.includes("mining") ||
    lower.includes("market") ||
    villageId === "VIL-03" ||
    villageId === "VIL-08"
  ) {
    return "bazaar";
  }
  if (villageId === "VIL-01" || villageId === "VIL-05") {
    return "mountain";
  }
  return "forest";
}

interface SettlementIconProps {
  villageId: string;
  villageName: string;
  selectedBoxBg?: string;
}

export default function SettlementIcon({
  villageId,
  villageName,
  selectedBoxBg,
}: SettlementIconProps) {
  const type = getSettlementIconType(villageId, villageName);

  const defaultBg =
    type === "bazaar" ? "bg-[#F4EAD5]" : "bg-[#E7EFE4]";
  const boxBg = selectedBoxBg || defaultBg;

  return (
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${boxBg}`}
      aria-hidden="true"
    >
      {type === "mountain" && (
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none">
          <path
            d="M3 19L9.5 7.5L13.4 14.2L16.1 10L21 19H3Z"
            fill="#3C6B43"
          />
          <path
            d="M9.5 7.5L11.3 10.6L9.9 11.4L8.6 10.2L7.4 11.2L9.5 7.5Z"
            fill="#F6F4EC"
          />
        </svg>
      )}
      {type === "forest" && (
        <TreePine className="w-4.5 h-4.5 text-[#3B7048]" strokeWidth={2} />
      )}
      {type === "bazaar" && (
        <Store className="w-4.5 h-4.5 text-[#7D5822]" strokeWidth={2} />
      )}
    </div>
  );
}
