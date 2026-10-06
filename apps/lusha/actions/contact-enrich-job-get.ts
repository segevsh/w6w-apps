import type { ActionDefinition } from "@w6w/types";
import { LushaClient, seg } from "../lib/client.ts";

interface Input {
  jobId: string;
}

const action: ActionDefinition<Input> = {
  key: "contact-enrich-job-get",
  type: "read",
  resource: "contact",
  title: "Get Contact Enrich Job",
  description:
    "Poll the async Data Waterfall job returned by Enrich Contacts. Poll every `retryAfter` seconds while status is processing; stop on complete, expired or failed. Polling is free.",
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "string",
      required: true,
      hint: "The `job.id` from Enrich Contacts.",
    },
  ],
  output: [
    { key: "jobId", type: "string", label: "Job id" },
    { key: "status", type: "string", label: "processing, complete, expired or failed" },
    { key: "retryAfter", type: "number", label: "Seconds to wait before polling again" },
    { key: "contacts", type: "array", label: "Completed contacts, final states only" },
    { key: "creditsCharged", type: "number", label: "Credits charged by the async phase" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("GET", `/v3/contacts/jobs/${seg(input.jobId)}`, {});
  },
};

export default action;
