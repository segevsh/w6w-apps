import { webhookTrigger } from "../lib/triggers.ts";

/** Any pull request activity; `actions` narrows it (e.g. `opened`). */
const pullRequest = webhookTrigger({
  key: "pull-request",
  title: "Pull Request Event",
  description:
    "Fires on pull request activity (opened, closed, synchronized, labeled and more). The run gets the action and the pull request.",
  event: "pull_request",
  hasActions: true,
  output: [
    { key: "payload.number", type: "number", label: "Pull request number" },
    { key: "payload.pull_request", type: "object", label: "Pull request" },
    { key: "payload.pull_request.title", type: "string", label: "Title" },
    { key: "payload.pull_request.html_url", type: "string", label: "URL" },
  ],
  samplePayload: {
    action: "opened",
    number: 42,
    pull_request: {
      number: 42,
      title: "Add a greeting",
      state: "open",
      html_url: "https://github.com/octocat/Hello-World/pull/42",
      user: { login: "octocat" },
    },
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default pullRequest;
