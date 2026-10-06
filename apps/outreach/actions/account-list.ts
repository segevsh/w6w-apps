import { listAction } from "../lib/factory.ts";
export default listAction({
  key: "account-list",
  title: "List Accounts",
  noun: "Account",
  type: "account",
  path: "accounts",
  search: true,
  description:
    "List accounts (companies) with Outreach filters, sorting and cursor pagination. Unnamed accounts are not returned by default.",
});
