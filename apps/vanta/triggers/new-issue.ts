import issueList from "../actions/issue-list.ts";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

export default pollFromListAction({
  key: "new-issue",
  title: "New Issue",
  description: "The run gets each newly created Vanta issue.",
  action: issueList,
  input: () => ({ orderBy: "createdDate", orderDirection: "desc", limit: 100, maxPages: 1 }),
  items: (result) => (result as { issues?: unknown[] }).issues ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Issue ID" }],
  sample: { id: "issue_1", title: "Review access" },
  maxPages: 1,
});
