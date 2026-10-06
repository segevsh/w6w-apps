import { getAction } from "../lib/factory.ts";
export default getAction({
  key: "account-get",
  title: "Get Account",
  noun: "Account",
  type: "account",
  path: "accounts",
  description: "Fetch one account by ID, optionally with related resources included.",
});
