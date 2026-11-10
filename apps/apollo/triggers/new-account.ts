import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/account-search.ts";

/**
 * `POST /accounts/search` with `sort_by_field: account_created_at` and `sort_ascending: false`
 * returns "the most recently created first"
 * (https://docs.apollo.io/reference/search-for-accounts, 2026-11-10). Accounts carry no update
 * stamp, so there is no `new-or-updated-account` sibling.
 */
const trigger = pollFromListAction({
  key: "new-account",
  title: "New Account",
  description: "The run gets each account newly saved to your team's Apollo instance.",
  action,
  input: () => ({
    sort_by_field: "account_created_at",
    sort_ascending: false,
    page: 1,
    per_page: 100,
  }),
  items: (result) => (result as { accounts?: unknown[] }).accounts ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "owner_id", type: "string", label: "Owner ID" },
    { key: "account_stage_id", type: "string", label: "Account stage ID" },
  ],
  sample: {
    id: "66e9abf95ac32901b20d1a0d",
    name: "The Fast Irish Copywriters",
    domain: "irishcopywriters.com",
    created_at: "2024-09-17T16:19:05.663Z",
    owner_id: "66302798d03b9601c7934ebf",
    account_stage_id: "61b8e913e0f4d2012e3af74e",
  },
});

export default trigger;
