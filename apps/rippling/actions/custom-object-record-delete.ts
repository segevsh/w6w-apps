import type { ActionDefinition } from "@w6w/types";
import { encodeId, RipplingClient } from "../lib/client.ts";
import { customObjectApiNameParam } from "../lib/custom-objects.ts";

interface Input {
  customObjectApiName: string;
  recordId: string;
}

const customObjectRecordDelete: ActionDefinition<Input> = {
  key: "custom-object-record-delete",
  type: "perform",
  resource: "custom-object-record",
  title: "Delete Custom Object Record",
  description:
    "Delete a custom object record (answers 204). Requires `custom-object-records.read-write` on the API token. Destructive; deleting an already-deleted record fails with a 404.",
  idempotent: true,
  params: [
    customObjectApiNameParam,
    { key: "recordId", label: "Record ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "True when Rippling answered 204" }],
  async execute(input, ctx) {
    const api = String(input.customObjectApiName ?? "").trim();
    const id = String(input.recordId ?? "").trim();
    if (!api) throw new Error("customObjectApiName is required");
    if (!id) throw new Error("recordId is required");
    await new RipplingClient(ctx).json(
      `/custom-objects/${encodeId(api)}/records/${encodeId(id)}/`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default customObjectRecordDelete;
