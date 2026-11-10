import { webhookTrigger } from "../lib/triggers.ts";

/** A CI/CD job changing status. */
const job = webhookTrigger({
  key: "job",
  title: "Job Event",
  description:
    "Fires when a CI/CD job changes status. The run gets the job, its stage and status, and the pipeline it belongs to.",
  kind: "build",
  flag: "job_events",
  hasActions: false,
  output: [
    { key: "payload.build_id", type: "number", label: "Job ID" },
    { key: "payload.build_name", type: "string", label: "Job name" },
    { key: "payload.build_stage", type: "string", label: "Stage" },
    { key: "payload.build_status", type: "string", label: "Status" },
    { key: "payload.pipeline_id", type: "number", label: "Pipeline ID" },
    { key: "payload.ref", type: "string", label: "Ref" },
  ],
  samplePayload: {
    object_kind: "build",
    ref: "main",
    build_id: 1977,
    build_name: "test",
    build_stage: "test",
    build_status: "success",
    pipeline_id: 2366,
    user: { username: "jsmith" },
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
  },
});

export default job;
