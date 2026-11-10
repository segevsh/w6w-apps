import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listAccounts from "../actions/list-accounts.ts";

export default pollFromListAction({
  key: "new-account",
  title: "New Account",
  description: "The run gets each newly created Outseta account (newest first).",
  action: listAccounts,
  input: () => ({ limit: 25, orderBy: "Created DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { Uid?: unknown }).Uid ?? ""),
  output: [
    { key: "Uid", type: "string", label: "Account Uid" },
    { key: "Name", type: "string", label: "Name" },
    { key: "AccountStageLabel", type: "string", label: "Billing stage" },
    { key: "Created", type: "string", label: "Created" },
  ],
  sample: {
    Uid: "wZmXq3Wd",
    Name: "Acme Inc",
    AccountStageLabel: "Trialing",
    Created: "2026-11-09T09:00:00Z",
  },
  maxPages: 1,
});
