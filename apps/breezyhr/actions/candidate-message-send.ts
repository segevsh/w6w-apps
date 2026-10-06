import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, candidate, compact } from "../lib/client.ts";
import { candidateParams } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  candidateId: string;
  body: string;
  subject?: string;
}

/**
 * `POST …/candidate/{id}/conversation` — delivers the message to the candidate (email). The
 * published request schema lists only `body`; the prose adds `subject` and a file attachment.
 * `subject` is sent as the prose says; attachments are not supported here.
 */
const candidateMessageSend: ActionDefinition<Input> = {
  key: "candidate-message-send",
  type: "perform",
  resource: "candidate",
  title: "Send Candidate Message",
  description:
    "Email a message to a candidate through their Breezy conversation. The candidate sees it; use Add Candidate Note for internal remarks.",
  idempotent: false,
  params: [
    ...candidateParams,
    { key: "body", label: "Message", type: "text", required: true, hint: "HTML or plain text." },
    { key: "subject", label: "Subject", type: "string" },
  ],
  output: [
    { key: "_id", type: "string", label: "Conversation activity ID" },
    { key: "type", type: "string", label: "Activity type" },
    { key: "object", type: "object", label: "The sent message (subject, body, delivery state)" },
    { key: "timestamp", type: "string", label: "Sent at" },
  ],

  execute(input, ctx) {
    return new BreezyClient(ctx).request(
      "POST",
      `${candidate(input.companyId, input.positionId, input.candidateId)}/conversation`,
      { body: compact({ body: input.body, subject: input.subject || undefined }) },
    );
  },
};

export default candidateMessageSend;
