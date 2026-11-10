import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/account-list.ts";

const output = [
  { key: "id", type: "number" as const, label: "Account ID" },
  { key: "type", type: "string" as const, label: "Resource type (account)" },
  { key: "attributes", type: "object" as const, label: "Account attributes (name, createdAt, …)" },
];

export default pollFromListAction({
  key: "new-account",
  title: "New Account",
  description: "The run gets each newly created Outreach account (company).",
  action,
  input: () => ({ sort: "-createdAt", pageSize: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output,
  sample: {
    id: 7,
    type: "account",
    attributes: {
      name: "Acme",
      createdAt: "2026-11-09T10:00:00.000Z",
      updatedAt: "2026-11-09T10:00:00.000Z",
    },
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
