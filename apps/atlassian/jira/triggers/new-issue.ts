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

/** Drop a trailing `ORDER BY …` (the last one outside double/single quotes) from user JQL. */
export function stripOrderBy(jql: string): string {
  let quote: string | null = null;
  let last = -1;
  for (let i = 0; i < jql.length; i++) {
    const c = jql[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (/order\s+by\b/iy.test(jql.slice(i, i + 40)) && (i === 0 || /\s|\)/.test(jql[i - 1]))) {
      last = i;
    }
  }
  return (last >= 0 ? jql.slice(0, last) : jql).trim();
}

export default pollFromListAction<Params>({
  key: "new-issue",
  title: "New Issue",
  description: "Fires when a newly created issue matches the JQL query.",
  action: issueSearch as unknown as ActionDefinition,
  input: ({ jql }) => ({
    jql: `${stripOrderBy(jql)} ORDER BY created DESC`,
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
      hint:
        "The trigger removes any trailing ORDER BY from your query and adds ORDER BY created DESC so newest issues are checked first.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Issue ID" },
    { key: "key", type: "string", label: "Issue key" },
    { key: "fields.summary", type: "string", label: "Summary" },
  ],
  sample: { id: "10001", key: "ENG-42", fields: { summary: "Prepare release notes" } },
});
