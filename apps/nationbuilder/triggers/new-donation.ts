import type { TriggerDefinition } from "@w6w/types";
import { pollDonations } from "../lib/triggers.ts";

const trigger: TriggerDefinition = {
  key: "new-donation",
  title: "New Donation",
  description: "The run gets each donation created since the previous check.",
  output: [
    { key: "id", type: "string", label: "Donation ID" },
    { key: "signup_id", type: "string", label: "Person ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "amount_in_cents", type: "number", label: "Amount in cents" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "501",
    type: "donations",
    signup_id: "101",
    email: "ada@example.org",
    amount_in_cents: 2500,
    status: "succeeded",
    created_at: "2026-11-10T09:00:00Z",
    updated_at: "2026-11-10T09:00:00Z",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => pollDonations("created_at", state, ctx),
};

export default trigger;
