import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no account-wide quota signal exists: a positive fact, not an omission.
 *
 * Checked 2026-10-06: the reference documents no rate-limit header and no usage endpoint for
 * the SMS/OTP/email credit balance. The one balance endpoint it documents
 * (`POST /subscriptions/fetchPrepaidBalance`) is WhatsApp-only and needs an integrated number
 * the connection does not carry, so it is an action (`whatsapp-balance-get`), not a check.
 * `severity: "informational"`, or the permanent `unknown` would pin the app's verdict there.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit / rate-limit headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "MSG91's reference documents no rate-limit header and no account-wide credit " +
      "endpoint (only a WhatsApp prepaid-balance call that needs an integrated number), so " +
      "there is no remaining-quota signal to read.",
  },
};

export default quota;
