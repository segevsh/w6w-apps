import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import accountStatementList from "../actions/account-statement-list.ts";

/** One account's statements, newest first (`order=desc`, the endpoint's documented default). */
export default pollFromListAction({
  key: "new-account-statement",
  title: "New Account Statement",
  description:
    "The run gets each new monthly statement of one account: id, period and download state.",
  action: accountStatementList as unknown as ActionDefinition,
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint: "The account to watch, from the account-list action.",
    },
  ],
  input: (params) => ({
    accountId: (params as { accountId?: string }).accountId,
    limit: 100,
    order: "desc",
  }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Statement ID" },
    { key: "startDate", type: "string", label: "Period start" },
    { key: "endDate", type: "string", label: "Period end" },
  ],
  sample: { id: "statement-1", startDate: "2026-10-01", endDate: "2026-10-31" },
  maxPages: 1,
});
