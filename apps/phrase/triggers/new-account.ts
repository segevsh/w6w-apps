import accountList from "../actions/account-list.ts";
import { snapshotTrigger } from "../lib/depth.ts";

// GET /accounts lists the organizations the token can see (a handful; no sort or filter;
// https://developers.phrase.com/en/api/strings/accounts/list-accounts, verified 2026-11-10); diffed by id.
export default snapshotTrigger<Record<string, unknown>>({
  key: "new-account",
  title: "New Account",
  description: "The run gets each Phrase account (organization) the token newly gains access to.",
  action: accountList as never,
  input: () => ({}),
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
  ],
  sample: { id: "account-sample-1", name: "Example Co", slug: "example-co" },
});
