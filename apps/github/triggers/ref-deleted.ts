import { webhookTrigger } from "../lib/triggers.ts";

/** A branch or tag deleted. */
const refDeleted = webhookTrigger({
  key: "ref-deleted",
  title: "Branch or Tag Deleted",
  description:
    "Fires when a branch or tag is deleted. The run gets the ref and whether it was a branch or a tag.",
  event: "delete",
  hasActions: false,
  output: [
    { key: "payload.ref", type: "string", label: "Ref name" },
    { key: "payload.ref_type", type: "string", label: "Ref type (branch or tag)" },
  ],
  samplePayload: {
    ref: "release-1.0",
    ref_type: "branch",
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default refDeleted;
