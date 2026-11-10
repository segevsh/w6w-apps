import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/account-list.ts";

type Account = { id?: unknown; attributes?: { updatedAt?: unknown } };

export default pollFromListAction({
  key: "new-or-updated-account",
  title: "New or Updated Account",
  description: "The run gets each Outreach account created or edited since the last check.",
  action,
  input: () => ({ sort: "-updatedAt", pageSize: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (x) =>
    `${String((x as Account).id ?? "")}:${String((x as Account).attributes?.updatedAt ?? "")}`,
  output: [
    { key: "id", type: "number", label: "Account ID" },
    { key: "type", type: "string", label: "Resource type (account)" },
    { key: "attributes", type: "object", label: "Account attributes (name, updatedAt, …)" },
  ],
  sample: {
    id: 7,
    type: "account",
    attributes: {
      name: "Acme",
      createdAt: "2026-11-09T10:00:00.000Z",
      updatedAt: "2026-11-09T11:30:00.000Z",
    },
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
