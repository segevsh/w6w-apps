import { webhookTrigger } from "../lib/triggers.ts";

/** `repo:fork` (https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/, verified 2026-11-10). */
const repoFork = webhookTrigger({
  key: "repo-fork",
  title: "Repository Forked",
  description:
    "Fires when the repository is forked. The run gets the original repository and the fork.",
  event: "repo:fork",
  output: [
    { key: "payload.fork", type: "object", label: "Fork" },
  ],
  samplePayload: {
    fork: { full_name: "emma/documentation-tests", is_private: false },
    repository: { full_name: "teamsinspace/documentation-tests" },
    actor: { display_name: "Emma" },
  },
});

export default repoFork;
