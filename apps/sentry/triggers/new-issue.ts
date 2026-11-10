import { pollFromListAction } from "../../_shared/poll/mod.ts";
import issueList from "../actions/issue-list.ts";

export default pollFromListAction({
  key: "new-issue",
  title: "New Issue",
  description: "The run gets each newly first-seen Sentry issue.",
  action: issueList,
  params: [{ key: "organizationSlug", label: "Organization Slug", type: "string", required: true }],
  input: (params: { organizationSlug: string }) => ({
    organizationSlug: params.organizationSlug,
    limit: 100,
    returnAll: false,
    sort: "new",
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Issue ID" }],
  sample: { id: "issue-1" },
  maxPages: 1,
});
