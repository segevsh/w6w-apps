import { webhookTrigger } from "../lib/triggers.ts";

/** A repository starred or unstarred. */
const star = webhookTrigger({
  key: "star",
  title: "Star Event",
  description:
    "Fires when someone stars or unstars the repository. The run gets the action and the stargazer.",
  event: "star",
  hasActions: true,
  output: [
    { key: "payload.starred_at", type: "string", label: "Starred at" },
    { key: "payload.sender", type: "object", label: "Stargazer" },
  ],
  samplePayload: {
    action: "created",
    starred_at: "2026-01-01T12:00:00Z",
    repository: { full_name: "octocat/Hello-World", stargazers_count: 42 },
    sender: { login: "octocat" },
  },
});

export default star;
