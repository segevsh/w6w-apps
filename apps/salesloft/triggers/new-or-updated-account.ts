import { pollFromListAction } from "../../_shared/poll/mod.ts";
import accountList from "../actions/account-list.ts";

/**
 * `GET` list with `sort_by=updated_at&sort_direction=DESC`: most recently updated first
 * (https://developers.salesloft.com/docs/api, sort_by / sort_direction on the list endpoint).
 */
export default pollFromListAction({
  key: "new-or-updated-account",
  title: "New or Updated Account",
  description: "The run gets each account when it is created or updated.",
  action: accountList,
  input: () => ({ sortBy: "updated_at", sortDirection: "DESC", page: 1, perPage: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id ?? ""}:${(item as { updated_at?: unknown }).updated_at ?? ""}`,
  output: [
    { key: "id", type: "number", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 501,
    name: "Example Co",
    domain: "example.test",
    updated_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
