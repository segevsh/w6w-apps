import { pollFromListAction } from "../../_shared/poll/mod.ts";
import accountList from "../actions/account-list.ts";

/**
 * `GET` list with `sort_by=created_at&sort_direction=DESC`: newest created first
 * (https://developers.salesloft.com/docs/api, sort_by / sort_direction on the list endpoint).
 */
export default pollFromListAction({
  key: "new-account",
  title: "New Account",
  description: "The run gets each newly created account.",
  action: accountList,
  input: () => ({ sortBy: "created_at", sortDirection: "DESC", page: 1, perPage: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 501,
    name: "Example Co",
    domain: "example.test",
    created_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
