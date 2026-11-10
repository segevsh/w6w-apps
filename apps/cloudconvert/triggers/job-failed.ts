import { webhookTrigger } from "../lib/triggers.ts";

/** A job fails (`job.failed`). */
const jobFailed = webhookTrigger({
  key: "job-failed",
  title: "Job Failed",
  description:
    "Fires when a CloudConvert job fails. The run gets the job id, tag, status, timestamps and its tasks.",
  event: "job.failed",
  sample: {
    event: "job.failed",
    jobId: "4b6ee8e2-e293-4805-b48e-a03876d1ec66",
    tag: "invoice-4411",
    status: "error",
    createdAt: "2026-11-10T09:18:47+00:00",
    endedAt: "2026-11-10T09:18:50+00:00",
    tasks: [
      {
        id: "acdf8096-10a1-4ab7-b009-539f5f329cad",
        name: "export-1",
        operation: "export/url",
        status: "error",
      },
    ],
    job: {
      id: "4b6ee8e2-e293-4805-b48e-a03876d1ec66",
      tag: "invoice-4411",
      status: "error",
    },
  },
});

export default jobFailed;
