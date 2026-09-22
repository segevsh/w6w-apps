import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/**
 * `GET /v1.0/communication/text?leadId={leadId}` — a lead's SMS history.
 *
 * Answers `{ texts: [...] }`. Each entry has `direction` ("Outbound" /
 * "Inbound"), `textOutcome` (delivery status such as "Delivered"),
 * `textType` ("Manual" / "Auto"), `textTime` and `textContent`.
 *
 * `currentId` turns pages by id rather than offset: the API starts from that id
 * and returns entries sequentially, which is what keeps a long thread stable
 * while new messages arrive.
 */
interface Input {
  leadId: number;
  limit?: number;
  offset?: number;
  currentId?: number;
}

const action: ActionDefinition<Input> = {
  key: "sms-history",
  type: "read",
  resource: "communication",
  title: "SMS History",
  description: "List a lead's SMS history (GET /v1.0/communication/text).",
  params: [
    leadIdParam,
    { key: "limit", label: "Limit", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "currentId",
      label: "Start from ID",
      type: "number",
      advanced: true,
      hint: "Page by id: retrieve entries sequentially from this id.",
    },
  ],
  output: [{ key: "texts", type: "array", label: "SMS entries" }],

  execute(input, ctx) {
    return new LoftyClient(ctx).request("/communication/text", {
      query: {
        leadId: input.leadId,
        limit: input.limit,
        offset: input.offset,
        currentId: input.currentId,
      },
    });
  },
};

export default action;
