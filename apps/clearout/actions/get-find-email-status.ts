import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient } from "../lib/client.ts";
import { mapFound } from "./find-email.ts";

interface Input {
  queueId: string;
}

/** `GET /email_finder/instant/queue_status?qid=` — result of a queued instant search. */
const getFindEmailStatus: ActionDefinition<Input> = {
  key: "get-find-email-status",
  type: "read",
  resource: "email",
  title: "Get Find Email Status",
  description: "Read the result of an instant email search that timed out and was queued.",
  params: [{
    key: "queueId",
    label: "Queue ID",
    type: "string",
    required: true,
    hint: "`queueId` from Find Email.",
  }],
  output: [
    { key: "emails", type: "array", label: "Candidates: email_address, role, business" },
    { key: "fullName", type: "string", label: "Full name" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "confidenceScore", type: "number", label: "Confidence score" },
    { key: "total", type: "number", label: "Number of candidates" },
    { key: "company", type: "object", label: "Company" },
  ],

  async execute(input, ctx) {
    const qid = String(input.queueId ?? "").trim();
    if (!qid) throw new Error("queueId is required");
    const { data } = await new ClearoutClient(ctx).request("/email_finder/instant/queue_status", {
      query: { qid },
    });
    return mapFound(data);
  },
};

export default getFindEmailStatus;
