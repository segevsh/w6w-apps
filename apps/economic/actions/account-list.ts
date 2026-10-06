import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "account-list",
  resource: "account",
  title: "List Accounts",
  description: "List the chart of accounts.",
  path: "/accounts",
});
