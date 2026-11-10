import { pollFromListAction } from "../../_shared/poll/mod.ts";
import accountList from "../actions/account-list.ts";

/**
 * `GET /v2/accounts` is free and "sorted by `created_at` descending (newest first)"
 * (https://docs.linkupapi.com/api-reference/v2/accounts/list-accounts.md).
 */
const trigger = pollFromListAction({
  key: "new-account",
  title: "New Connected Account",
  description: "The run gets each channel account newly connected to the LinkupAPI key.",
  action: accountList,
  input: () => ({ count: 50, offset: 0 }),
  items: (result) => {
    const data = (result as { data?: { items?: unknown } }).data;
    return Array.isArray(data?.items) ? data.items : [];
  },
  idOf: (item) => String((item as { account_id?: unknown }).account_id ?? ""),
  output: [
    { key: "account_id", type: "string", label: "Account ID" },
    { key: "platform", type: "string", label: "linkedin, whatsapp or email" },
    { key: "account_name", type: "string", label: "Account name" },
    { key: "is_active", type: "boolean", label: "Active" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    account_id: "sample-account-id",
    platform: "linkedin",
    account_name: "Avery Example",
    is_active: true,
    status: "connected",
    created_at: "2026-11-10T09:30:00Z",
  },
  maxPages: 1,
});

export default trigger;
