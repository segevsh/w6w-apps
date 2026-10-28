import type { ActionDefinition } from "@w6w/types";
import { JiraClient, unset } from "../lib/client.ts";
import { issueKey, issueOutput } from "../lib/params.ts";

interface Input {
  issueKey: string;
  fields?: string;
  expand?: string;
}

const issueGet: ActionDefinition<Input> = {
  key: "issue-get",
  type: "read",
  resource: "issue",
  title: "Get Issue",
  description: "Fetch an issue by key or id.",
  params: [
    issueKey,
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated field list, e.g. `summary,status,assignee`. Defaults to all.",
    },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      advanced: true,
      hint: "Comma-separated: `renderedFields`, `changelog`, `transitions`, …",
    },
  ],
  output: issueOutput,

  execute(input, ctx) {
    return new JiraClient(ctx).request(`/issue/${encodeURIComponent(input.issueKey)}`, {
      query: { fields: unset(input.fields), expand: unset(input.expand) },
    });
  },
};

export default issueGet;
