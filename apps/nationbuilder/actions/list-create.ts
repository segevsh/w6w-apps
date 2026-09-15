import type { ActionDefinition } from "@w6w/types";
import { dataEnvelope, flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";

interface Input {
  name: string;
  slug?: string;
  description?: string;
  isSharingWritable?: boolean;
}

/** `POST /api/v2/lists` — confirmed against the vendor's OpenAPI spec. */
const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: "Create a new custom list.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      advanced: true,
      hint: "A unique identifier for the list. Leave blank to let NationBuilder assign one.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "isSharingWritable",
      label: "Gives edit permission to people the list is shared with",
      type: "boolean",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/lists", {
      method: "POST",
      body: dataEnvelope("lists", {
        name: input.name,
        slug: input.slug,
        description: input.description,
        is_sharing_writable: input.isSharingWritable,
      }),
    });
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default listCreate;
