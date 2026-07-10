import React from "react";
import { Badge } from "@chakra-ui/react";

const TONE_COLOR_SCHEMES = {
  neutral: "gray",
  pending: "orange",
  positive: "green",
  info: "blue",
  critical: "red",
};

/**
 * Small semantic status pill. Callers pass a `tone` rather than a raw color
 * so status meaning (pending/positive/critical/...) stays consistent across
 * the app instead of each screen picking its own colorScheme per status string.
 * @param {{label: string, tone?: keyof typeof TONE_COLOR_SCHEMES}} props
 */
export function StatusPill({ label, tone = "neutral" }) {
  const colorScheme = TONE_COLOR_SCHEMES[tone] || TONE_COLOR_SCHEMES.neutral;

  return (
    <Badge colorScheme={colorScheme} variant="subtle" borderRadius="full" px={2} fontSize="xs">
      {label}
    </Badge>
  );
}

export const EMAIL_BLAST_STATUS_TONES = {
  draft: "neutral",
  "pending-approval": "pending",
  approved: "info",
  scheduled: "info",
  sending: "pending",
  sent: "positive",
};

export const SEND_QUEUE_STATUS_TONES = {
  Queued: "pending",
  Processing: "info",
  Completed: "positive",
};
