import { webhookTrigger } from "../lib/triggers.ts";

/** A CI/CD pipeline changing status. */
const pipeline = webhookTrigger({
  key: "pipeline",
  title: "Pipeline Event",
  description:
    "Fires when a CI/CD pipeline changes status. The run gets the pipeline, its status and the builds it ran.",
  kind: "pipeline",
  flag: "pipeline_events",
  hasActions: false,
  output: [
    { key: "payload.object_attributes", type: "object", label: "Pipeline" },
    { key: "payload.object_attributes.status", type: "string", label: "Status" },
    { key: "payload.object_attributes.ref", type: "string", label: "Ref" },
    { key: "payload.builds", type: "array", label: "Builds" },
  ],
  samplePayload: {
    object_kind: "pipeline",
    user: { username: "jsmith" },
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
    object_attributes: { id: 31, ref: "master", status: "success", source: "push" },
    builds: [{ id: 380, stage: "deploy", name: "production", status: "success" }],
  },
});

export default pipeline;
