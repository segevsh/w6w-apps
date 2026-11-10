import { webhookTrigger } from "../lib/triggers.ts";

/** A job is created (`job.created`). */
const jobCreated = webhookTrigger({
  key: "job-created",
  title: "Job Created",
  description:
    "Fires when a CloudConvert job is created on the account, by this app or anything else using the account. The run gets the job id, tag, status and its task list.",
  event: "job.created",
  sample: {
    event: "job.created",
    jobId: "4b6ee8e2-e293-4805-b48e-a03876d1ec66",
    tag: "invoice-4411",
    status: "waiting",
    createdAt: "2026-11-10T09:18:47+00:00",
    endedAt: null,
    tasks: [
      {
        id: "acdf8096-10a1-4ab7-b009-539f5f329cad",
        name: "export-1",
        operation: "export/url",
        status: "waiting",
      },
    ],
    job: {
      id: "4b6ee8e2-e293-4805-b48e-a03876d1ec66",
      tag: "invoice-4411",
      status: "waiting",
    },
  },
});

export default jobCreated;
