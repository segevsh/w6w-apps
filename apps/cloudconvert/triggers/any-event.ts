import { anyEventTrigger } from "../lib/triggers.ts";

/** Any CloudConvert webhook event (https://cloudconvert.com/api/v2/webhooks, verified 2026-11-10). */
export default anyEventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any CloudConvert job event you choose (job created, finished, failed). Leave Events empty for all of them. The run gets the event name, the job id, tag, status, timestamps and its tasks, including the export tasks' file URLs.",
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
