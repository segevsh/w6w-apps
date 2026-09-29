import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";
import { entityBody, entityFields } from "../lib/params.ts";

interface Input extends Record<string, unknown> {
  office_id: string;
}

/** `PUT /v2/public/office/{office_id}` — update an existing office. */
const officeUpdate: ActionDefinition<Input> = {
  key: "office-update",
  type: "perform",
  resource: "office",
  title: "Update Office",
  description: "Update fields on an existing office. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "office_id", label: "Office ID", type: "string", required: true },
    ...entityFields("office", { create: false }),
  ],
  output: [
    { key: "id", type: "number", label: "Office ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const { office_id, ...fields } = input;
    return await new KvCoreClient(ctx).json(`/office/${encodeURIComponent(office_id)}`, {
      method: "PUT",
      body: entityBody(fields),
    });
  },
};

export default officeUpdate;
