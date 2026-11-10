import { webhookTrigger } from "../lib/triggers.ts";

/** A deployment changing status. */
const deployment = webhookTrigger({
  key: "deployment",
  title: "Deployment Event",
  description:
    "Fires when a deployment starts, succeeds, fails or is canceled. The run gets the status and the environment.",
  kind: "deployment",
  flag: "deployment_events",
  hasActions: false,
  output: [
    { key: "payload.status", type: "string", label: "Status" },
    { key: "payload.environment", type: "string", label: "Environment" },
    { key: "payload.deployment_id", type: "number", label: "Deployment ID" },
    { key: "payload.deployable_url", type: "string", label: "Job URL" },
  ],
  samplePayload: {
    object_kind: "deployment",
    status: "success",
    deployment_id: 15,
    environment: "staging",
    deployable_url: "https://example.com/gitlab-org/gitlab-test/-/jobs/796",
    user: { username: "jsmith" },
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
  },
});

export default deployment;
