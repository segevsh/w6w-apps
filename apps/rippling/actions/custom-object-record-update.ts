import type { ActionDefinition } from "@w6w/types";
import { asJsonObject, encodeId, RipplingClient } from "../lib/client.ts";
import { customObjectApiNameParam } from "../lib/custom-objects.ts";

interface Input {
  customObjectApiName: string;
  recordId: string;
  fields: unknown;
}

const customObjectRecordUpdate: ActionDefinition<Input> = {
  key: "custom-object-record-update",
  type: "perform",
  resource: "custom-object-record",
  title: "Update Custom Object Record",
  description:
    "Patch a custom object record. Requires `custom-object-records.read-write` on the API token. Only the fields you send change.",
  idempotent: true,
  params: [
    customObjectApiNameParam,
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The record's id (the `codr_id`, from List or Query Custom Object Records).",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: "JSON object holding only the fields to change.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "name", type: "string", label: "Record name" },
    { key: "external_id", type: "string", label: "External ID" },
  ],
  async execute(input, ctx) {
    const api = String(input.customObjectApiName ?? "").trim();
    const id = String(input.recordId ?? "").trim();
    if (!api) throw new Error("customObjectApiName is required");
    if (!id) throw new Error("recordId is required");
    const body = await new RipplingClient(ctx).json<{ data?: unknown }>(
      `/custom-objects/${encodeId(api)}/records/${encodeId(id)}/`,
      { method: "PATCH", body: asJsonObject(input.fields, "fields") },
    );
    return body && typeof body === "object" && "data" in body ? body.data : body;
  },
};

export default customObjectRecordUpdate;
