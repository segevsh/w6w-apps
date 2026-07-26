import type { ActionDefinition } from "@w6w/types";
import { ISSUE_FIELDS, LinearClient } from "../lib/client.ts";

const QUERY = `
  query Issue($id: String!) {
    issue(id: $id) { ${ISSUE_FIELDS} }
  }
`;

const issueGet: ActionDefinition<{ issueId: string }> = {
  key: "issue-get",
  type: "read",
  resource: "issue",
  title: "Get Issue",
  description: "Fetch an issue by its UUID or its human identifier (e.g. ENG-42).",
  params: [
    {
      key: "issueId",
      label: "Issue ID",
      type: "string",
      required: true,
      hint: "UUID, or the identifier shown in the UI such as `ENG-42`.",
    },
  ],
  output: [
    { key: "issue.id", type: "string", label: "Issue ID" },
    { key: "issue.identifier", type: "string", label: "Identifier" },
    { key: "issue.title", type: "string", label: "Title" },
    { key: "issue.state", type: "object", label: "State" },
    { key: "issue.assignee", type: "object", label: "Assignee" },
  ],

  execute(input, ctx) {
    return new LinearClient(ctx).query(QUERY, { id: input.issueId });
  },
};

export default issueGet;
