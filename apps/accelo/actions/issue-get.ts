import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "issue-get",
  resource: "issue",
  path: "/issues",
  idKey: "issueId",
  idLabel: "Issue ID",
  title: "Get Issue",
  description: "Fetch one issue (ticket) by id.",
});
