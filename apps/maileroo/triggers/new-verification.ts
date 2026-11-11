import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-verifications.ts";

// "Results are ordered newest first and retained for 120 days"
// (https://maileroo.com/docs/api-reference/otp-verification/verifications/list).
export default pollFromListAction({
  key: "new-verification",
  title: "New Verification",
  description:
    "The run gets each OTP verification started on the account since the previous check.",
  action,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Verification ID (vrf_…)" },
    { key: "channel", type: "string", label: "Channel" },
    { key: "status", type: "string", label: "Status when the check saw it" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "vrf_1123456789abcdef01234567",
    sender_profile_id: "prf_0123456789abcdef01234567",
    channel: "sms",
    status: "pending",
    created_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
