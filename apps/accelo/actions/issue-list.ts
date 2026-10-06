import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "issue-list",
  resource: "issue",
  path: "/issues",
  title: "List Issues",
  description: "List issues (tickets).",
});
