import type { ActionDefinition } from "@w6w/types";
import { encodeId, IroncladClient } from "../lib/client.ts";
import { hydrateEntitiesParam, recordIdParam } from "../lib/params.ts";

interface Input {
  recordId: string;
  hydrateEntities?: boolean;
  addressAsObject?: boolean;
}

const recordGet: ActionDefinition<Input> = {
  key: "record-get",
  type: "read",
  resource: "record",
  title: "Get Record",
  description: "Fetch one repository record with its properties, attachments and links.",
  params: [
    recordIdParam,
    hydrateEntitiesParam,
    { key: "addressAsObject", label: "Addresses as objects", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Record type" },
    { key: "properties", type: "object", label: "Properties" },
    { key: "attachments", type: "object", label: "Attachments" },
    { key: "links", type: "array", label: "Links" },
  ],

  execute(input, ctx) {
    return new IroncladClient(ctx).json(`/records/${encodeId(input.recordId)}`, {
      query: {
        hydrateEntities: input.hydrateEntities ? true : undefined,
        addressAsObject: input.addressAsObject ? true : undefined,
      },
    });
  },
};

export default recordGet;
