import type { ActionDefinition } from "@w6w/types";
import { asJsonObject, encodeId, RipplingClient } from "../lib/client.ts";
import { customObjectApiNameParam } from "../lib/custom-objects.ts";

interface Input {
  customObjectApiName: string;
  fields: unknown;
}

/**
 * The create and update responses wrap the record as `{ "data": { ... } }`,
 * while get-by-external-id answers the record bare. The wrapper is unwrapped
 * here so a workflow reads one record shape from every action.
 */
const customObjectRecordCreate: ActionDefinition<Input> = {
  key: "custom-object-record-create",
  type: "perform",
  resource: "custom-object-record",
  title: "Create Custom Object Record",
  description:
    "Create a record on a custom object. Requires `custom-object-records.read-write` on the API token. Not idempotent: Rippling documents no idempotency key, so a retry may create a second record unless you set a unique external_id.",
  idempotent: false,
  params: [
    customObjectApiNameParam,
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint:
        "JSON object of field values. Names and types come from the custom object's own schema " +
        '(see List Custom Object Fields), e.g. {"name": "Laptop", "external_id": "asset-17"}.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "name", type: "string", label: "Record name" },
    { key: "external_id", type: "string", label: "External ID" },
  ],
  async execute(input, ctx) {
    const api = String(input.customObjectApiName ?? "").trim();
    if (!api) throw new Error("customObjectApiName is required");
    const body = await new RipplingClient(ctx).json<{ data?: unknown }>(
      `/custom-objects/${encodeId(api)}/records/`,
      { method: "POST", body: asJsonObject(input.fields, "fields") },
    );
    return body && typeof body === "object" && "data" in body ? body.data : body;
  },
};

export default customObjectRecordCreate;
