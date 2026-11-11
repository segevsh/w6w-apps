import { webhookTrigger } from "../lib/triggers.ts";

/** A repository created, deleted, archived, renamed or otherwise changed; `actions` narrows it. */
const repositoryEvent = webhookTrigger({
  key: "repository-event",
  title: "Repository Event",
  description:
    "Fires on repository changes (created, deleted, archived, renamed, transferred and more). The run gets the action and the repository.",
  event: "repository",
  hasActions: true,
  output: [
    { key: "payload.repository", type: "object", label: "Repository" },
    { key: "payload.repository.full_name", type: "string", label: "Repository full name" },
  ],
  samplePayload: {
    action: "created",
    repository: {
      full_name: "octocat/Hello-World",
      private: false,
      html_url: "https://github.com/octocat/Hello-World",
    },
    sender: { login: "octocat" },
  },
});

export default repositoryEvent;
