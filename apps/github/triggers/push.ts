import { webhookTrigger } from "../lib/triggers.ts";

/** A push to the repository (branch or tag). */
const push = webhookTrigger({
  key: "push",
  title: "New Push",
  description:
    "Fires when commits are pushed to a repository. The run gets the ref, the before and after commit ids and the commits pushed.",
  event: "push",
  hasActions: false,
  output: [
    { key: "payload.ref", type: "string", label: "Ref" },
    { key: "payload.before", type: "string", label: "Before commit" },
    { key: "payload.after", type: "string", label: "After commit" },
    { key: "payload.commits", type: "array", label: "Commits" },
    { key: "payload.head_commit", type: "object", label: "Head commit" },
  ],
  samplePayload: {
    ref: "refs/heads/main",
    before: "0f1e2d3c4b5a69788796a5b4c3d2e1f001122334",
    after: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
    commits: [{
      id: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
      message: "Fix the build",
      author: { name: "Octo Cat", username: "octocat" },
    }],
    head_commit: { id: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678", message: "Fix the build" },
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default push;
