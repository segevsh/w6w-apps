import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  jobId: string;
  message: string;
}

const action: ActionDefinition<Input> = {
  key: "job-message-create",
  type: "perform",
  resource: "job",
  title: "Post Job Message",
  description:
    "Post a comment to a job's message feed, visible in the job's Messages section in AccuLynx.",
  idempotent: false,
  params: [
    idParam("jobId", "Job id"),
    { key: "message", label: "Message", type: "text", required: true },
  ],
  output: [{ key: "messageId", type: "string", label: "New message id" }],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).send(`/jobs/${encodeId(input.jobId)}/messages`, {
      method: "POST",
      body: { message: input.message },
    });
  },
};

export default action;
