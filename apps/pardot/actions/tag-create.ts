import type { ActionDefinition } from "@w6w/types";
import { PardotClient, unset } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,name,objectCount,createdAt";

const tagCreate: ActionDefinition<{ name: string; fields?: string }> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag. Apply it to a prospect with Add Tag to Prospect.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    fieldsParam(DEFAULT_FIELDS),
  ],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const created = await new PardotClient(ctx).request("/tags", {
      method: "POST",
      query: { fields: unset(input.fields) ?? DEFAULT_FIELDS },
      body: { name: input.name },
    });
    return created ?? { created: true };
  },
};

export default tagCreate;
