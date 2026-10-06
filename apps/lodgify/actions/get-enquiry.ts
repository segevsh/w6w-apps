import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireNumber, segment } from "../lib/client.ts";

/** Read one enquiry. Wraps `GET /v1/reservation/enquiry/{id}` (GetEnquiryById). */
const action: ActionDefinition = {
  key: "get-enquiry",
  type: "read",
  resource: "enquiry",
  title: "Get an enquiry",
  description: "Show one enquiry: dates, guest, rooms, status and its message thread.",
  params: [{ key: "enquiryId", label: "Enquiry ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Enquiry ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "arrival", type: "string", label: "Arrival" },
    { key: "departure", type: "string", label: "Departure" },
    { key: "guest", type: "object", label: "Guest" },
    { key: "messages", type: "array", label: "Messages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.enquiryId, "enquiryId");
    return await new LodgifyClient(ctx).request(`/v1/reservation/enquiry/${segment(id)}`);
  },
};

export default action;
