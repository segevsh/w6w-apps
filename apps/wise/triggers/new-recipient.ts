import { pollFromListAction } from "../../_shared/poll/mod.ts";
import recipientList from "../actions/recipient-list.ts";

/**
 * `recipient-list`: `GET /accounts?sort=id,desc&size=20` — Wise documents `sort=id,desc` as
 * "sorts in descending order by id" and a maximum page of 20
 * (https://docs.wise.com/api-reference/recipient/recipientlist, verified 2026-11-10), so page 1 is
 * the newest recipients.
 */
const trigger = pollFromListAction<{ profileId?: number }>({
  key: "new-recipient",
  title: "New Recipient",
  description:
    "The run gets each recipient account newly created on the chosen Wise profile (active accounts, newest first).",
  action: recipientList,
  params: [{
    key: "profileId",
    label: "Profile ID",
    type: "number",
    hint: "Personal or business profile; defaults to the personal profile.",
  }],
  input: (p) => ({ profile: p.profileId, sort: "id,desc", size: 20 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: number | string }).id),
  output: [
    { key: "id", type: "number", label: "Recipient ID" },
    { key: "profileId", type: "number", label: "Profile ID" },
    { key: "name", type: "object", label: "Name" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "type", type: "string", label: "Account Type" },
    { key: "country", type: "string", label: "Country" },
  ],
  sample: {
    id: 700525176,
    profileId: 222,
    name: { fullName: "Ada Lovelace" },
    currency: "GBP",
    type: "sort_code",
    country: "GB",
    active: true,
  },
});

export default trigger;
