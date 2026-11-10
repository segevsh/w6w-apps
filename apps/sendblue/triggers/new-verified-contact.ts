import type { TriggerDefinition } from "@w6w/types";
import verifiedContactList from "../actions/verified-contact-list.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /v3/verified-contacts` lists the contacts attached to the account's shared line as
 * `data.contacts[]` with no paging, sort or date filter — a small bounded per-account collection
 * (https://docs.sendblue.com/api/resources/verified_contacts/methods/list/, verified 2026-11-10).
 * Every check reads it through `verified-contact-list` and diffs the `phone_number`s.
 */
const trigger: TriggerDefinition = {
  key: "new-verified-contact",
  title: "New Verified Contact",
  description: "The run gets each contact newly attached to your Sendblue shared line.",
  output: [
    { key: "phone_number", type: "string", label: "Phone number" },
    { key: "verification_status", type: "string", label: "Verification status" },
    { key: "verified", type: "boolean", label: "Verified" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    phone_number: "+12125550199",
    verification_status: "pending",
    verified: false,
    created_at: "2026-11-10T09:00:00.000Z",
    updated_at: "2026-11-10T09:00:00.000Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await verifiedContactList.execute({}, ctx) as
      | { data?: { contacts?: unknown } }
      | null;
    const contacts = res?.data?.contacts;
    return newRecords({
      state,
      items: Array.isArray(contacts) ? contacts : [],
      idOf: (c) => (c as { phone_number?: unknown }).phone_number,
    });
  },
};

export default trigger;
