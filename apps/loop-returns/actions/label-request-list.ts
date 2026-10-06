import type { ActionDefinition } from "@w6w/types";
import { LoopClient } from "../lib/client.ts";

/**
 * List Label Requests.
 *
 * `GET /label-requests` (Label Requests (Read) scope). Offset/limit pagination, not cursor.
 */
interface Input {
  from?: string;
  to?: string;
  returnId?: number;
  status?: string;
  limit?: number;
  offset?: number;
}

const action: ActionDefinition<Input> = {
  key: "label-request-list",
  type: "read",
  resource: "label-request",
  title: "List Label Requests",
  description:
    "List label requests (third-party label integrations), filterable by return, status and time.",
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      hint: "Created at or after this time (ISO 8601).",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      hint: "Created at or before this time (ISO 8601).",
    },
    {
      key: "returnId",
      label: "Return ID",
      type: "number",
      hint: "Only requests for this return.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      hint: "Only requests in this status.",
      options: [
        { value: "issued", label: "Issued" },
        { value: "cancelled", label: "Cancelled" },
        { value: "fulfilled", label: "Fulfilled" },
      ],
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      hint: "Results per page, 1–250 (Loop's maximum). Prefilled at 25; Loop's own default is 50.",
      default: 25,
      validation: { integer: true, min: 1, max: 250 },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint: "Requests to skip.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "labelRequests", type: "array", label: "Label requests" },
    { key: "limit", type: "number", label: "Page size used" },
    { key: "offset", type: "number", label: "Offset used" },
  ],

  async execute(input, ctx) {
    const limit = input.limit ?? 25;
    const offset = input.offset ?? 0;
    const res = await new LoopClient(ctx).get("/label-requests", {
      from: input.from,
      to: input.to,
      return_id: input.returnId,
      status: input.status,
      limit,
      offset,
    }) as Record<string, unknown>;
    return { labelRequests: res.data ?? [], limit, offset };
  },
};

export default action;
