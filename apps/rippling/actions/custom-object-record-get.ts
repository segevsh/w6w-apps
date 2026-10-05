import type { ActionDefinition } from "@w6w/types";
import { encodeId, RipplingClient } from "../lib/client.ts";
import { customObjectApiNameParam } from "../lib/custom-objects.ts";

interface Input {
  customObjectApiName: string;
  externalId: string;
}

const customObjectRecordGet: ActionDefinition<Input> = {
  key: "custom-object-record-get",
  type: "read",
  resource: "custom-object-record",
  title: "Get Custom Object Record by External ID",
  description:
    "Retrieve one custom object record by the external_id you stored on it. Requires `custom-object-records.read` (or a read-write scope). Rippling documents no get-by-record-id endpoint, so the external id is the only direct lookup.",
  params: [
    customObjectApiNameParam,
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      required: true,
      hint: "The record's external_id.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "name", type: "string", label: "Record name" },
    { key: "external_id", type: "string", label: "External ID" },
  ],
  execute(input, ctx) {
    const api = String(input.customObjectApiName ?? "").trim();
    const ext = String(input.externalId ?? "").trim();
    if (!api) throw new Error("customObjectApiName is required");
    if (!ext) throw new Error("externalId is required");
    return new RipplingClient(ctx).json(
      `/custom-objects/${encodeId(api)}/records/external_id/${encodeId(ext)}/`,
    );
  },
};

export default customObjectRecordGet;
