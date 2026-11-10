import { webhookTrigger } from "../lib/triggers.ts";

const pullRequestCreated = webhookTrigger({
  key: "pull-request-created",
  title: "New Pull Request",
  description: "Fires when a pull request is created. The run gets the pull request.",
  event: "pullrequest:created",
  output: [
    { key: "payload.pullrequest", type: "object", label: "Pull request" },
    { key: "payload.pullrequest.id", type: "number", label: "Pull request number" },
    { key: "payload.pullrequest.title", type: "string", label: "Title" },
    { key: "payload.pullrequest.links.self.href", type: "string", label: "API URL" },
  ],
  samplePayload: {
    pullrequest: {
      id: 1,
      title: "Add a greeting",
      state: "OPEN",
      links: {
        self: {
          href:
            "https://api.bitbucket.org/2.0/repositories/teamsinspace/documentation-tests/pullrequests/1",
        },
      },
    },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default pullRequestCreated;
