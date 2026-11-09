import { webhookTrigger } from "../lib/triggers.ts";

/** Any issue activity; `actions` narrows it (e.g. `opened`). */
const issue = webhookTrigger({
  key: "issue",
  title: "Issue Event",
  description:
    "Fires on issue activity (opened, closed, edited, labeled, assigned and more). The run gets the action and the issue.",
  event: "issues",
  hasActions: true,
  output: [
    { key: "payload.issue", type: "object", label: "Issue" },
    { key: "payload.issue.number", type: "number", label: "Issue number" },
    { key: "payload.issue.title", type: "string", label: "Title" },
    { key: "payload.issue.html_url", type: "string", label: "URL" },
  ],
  samplePayload: {
    action: "opened",
    issue: {
      number: 1347,
      title: "Found a bug",
      state: "open",
      html_url: "https://github.com/octocat/Hello-World/issues/1347",
      user: { login: "octocat" },
    },
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default issue;
