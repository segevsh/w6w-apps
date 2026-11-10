import { webhookTrigger } from "../lib/triggers.ts";

/** A branch or tag created. */
const refCreated = webhookTrigger({
  key: "ref-created",
  title: "Branch or Tag Created",
  description:
    "Fires when a branch or tag is created. The run gets the ref, whether it is a branch or a tag, and the default branch.",
  event: "create",
  hasActions: false,
  output: [
    { key: "payload.ref", type: "string", label: "Ref name" },
    { key: "payload.ref_type", type: "string", label: "Ref type (branch or tag)" },
    { key: "payload.master_branch", type: "string", label: "Default branch" },
  ],
  samplePayload: {
    ref: "release-1.0",
    ref_type: "branch",
    master_branch: "main",
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default refCreated;
