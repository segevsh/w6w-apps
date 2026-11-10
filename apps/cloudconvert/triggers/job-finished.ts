import { webhookTrigger } from "../lib/triggers.ts";

/** A job finishes successfully (`job.finished`). */
const jobFinished = webhookTrigger({
  key: "job-finished",
  title: "Job Finished",
  description:
    "Fires when a CloudConvert job and all its tasks complete successfully. The run gets the job id, tag, status, timestamps and its tasks, including the export tasks' file URLs.",
  event: "job.finished",
  sample: {
    event: "job.finished",
    jobId: "4b6ee8e2-e293-4805-b48e-a03876d1ec66",
    tag: "invoice-4411",
    status: "finished",
    createdAt: "2026-11-10T09:18:47+00:00",
    endedAt: "2026-11-10T09:18:52+00:00",
    tasks: [
      {
        id: "acdf8096-10a1-4ab7-b009-539f5f329cad",
        name: "export-1",
        operation: "export/url",
        status: "finished",
      },
    ],
    job: {
      id: "4b6ee8e2-e293-4805-b48e-a03876d1ec66",
      tag: "invoice-4411",
      status: "finished",
    },
  },
});

export default jobFinished;
