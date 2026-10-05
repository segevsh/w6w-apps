import type { ActionDefinition } from "@w6w/types";
import { NetSuiteClient, recordType, REST } from "../lib/client.ts";

interface Input {
  recordType?: string;
}

/**
 * `GET /services/rest/record/v1/metadata-catalog` lists every record type the account exposes;
 * `GET …/metadata-catalog/<type>` with `Accept: application/schema+json` returns that type's JSON
 * Schema (fields, sublists, subrecords; fields you can filter on carry `x-ns-filterable`). Both
 * verified in "Working with Resource Metadata". The metadata is per account and per role, so it
 * includes your custom records and fields.
 */
const metadataGet: ActionDefinition<Input> = {
  key: "metadata-get",
  type: "read",
  resource: "metadata",
  title: "Get Record Metadata",
  description: "List the record types your account exposes, or get one type's JSON Schema.",
  params: [
    {
      key: "recordType",
      label: "Record type",
      type: "string",
      placeholder: "customer",
      hint: "Leave blank to list every record type in the catalog.",
    },
  ],
  output: [
    { key: "metadata", type: "object", label: "Catalog items, or the record's JSON Schema" },
  ],

  async execute(input, ctx) {
    const client = new NetSuiteClient(ctx);
    const type = input.recordType?.trim();
    if (!type) {
      const res = await client.request(`${REST}/record/v1/metadata-catalog`);
      return { metadata: res.data };
    }
    const res = await client.request(`${REST}/record/v1/metadata-catalog/${recordType(type)}`, {
      headers: { accept: "application/schema+json" },
    });
    return { metadata: res.data };
  },
};

export default metadataGet;
