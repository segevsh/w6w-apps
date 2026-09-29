import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  office_id: string;
}

/** `GET /v2/public/office/{office_id}` — a single office's full record. */
const officeGet: ActionDefinition<Input> = {
  key: "office-get",
  type: "read",
  resource: "office",
  title: "Get Office",
  description: "Fetch a single office by ID.",
  params: [{ key: "office_id", label: "Office ID", type: "string", required: true }],
  output: [
    { key: "id", type: "number", label: "Office ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json(`/office/${encodeURIComponent(input.office_id)}`);
  },
};

export default officeGet;
