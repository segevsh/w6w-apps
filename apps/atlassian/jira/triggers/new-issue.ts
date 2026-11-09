import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import issueSearch from "../actions/issue-search.ts";

interface Params {
  jql: string;
}

function issueId(issue: unknown): string {
  const id = (issue as { id?: unknown }).id;
  if (typeof id !== "string" || !id) {
    throw new Error("Jira issue search returned an issue without id");
  }
  return id;
}

export default pollFromListAction<Params>({
  key: "new-issue",
  title: "New Issue",
  description: "Fires when a newly created issue matches the JQL query.",
  action: issueSearch as unknown as ActionDefinition,
  input: ({ jql }) => ({
    jql: `${jql.trim()} ORDER BY created DESC`,
    maxResults: 50,
    startAt: 0,
  }),
  items: (result) => (result as { issues?: unknown[] }).issues ?? [],
  idOf: issueId,
  params: [
    {
      key: "jql",
      label: "JQL query",
      type: "text",
      required: true,
      config: { multiline: true },
      placeholder: "project = ENG AND status != Done",
      hint: "The trigger adds ORDER BY created DESC so newest issues are checked first.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Issue ID" },
    { key: "key", type: "string", label: "Issue key" },
    { key: "fields.summary", type: "string", label: "Summary" },
  ],
  sample: { id: "10001", key: "ENG-42", fields: { summary: "Prepare release notes" } },
});
