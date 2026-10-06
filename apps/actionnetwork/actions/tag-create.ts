import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need } from "../lib/client.ts";
import type { Input } from "../lib/factory.ts";

/**
 * `POST /tags`. Tags are deduplicated by name: posting an existing name answers with a redirect to
 * the existing tag's resource rather than a new one. Group API keys only.
 */
const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description:
    "Create a tag by name. Names are unique: creating an existing name returns the existing tag. PUT and DELETE on tags are not allowed by the vendor. Group API keys only.",
  idempotent: true,
  params: [{ key: "name", label: "Name", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Action Network id (UUID)" },
    { key: "identifiers", type: "array", label: "All identifiers, `system:id`" },
    { key: "name", type: "string", label: "Tag name" },
    { key: "created_date", type: "string", label: "Created (ISO 8601)" },
    { key: "modified_date", type: "string", label: "Last modified (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new ActionNetworkClient(ctx).create("/tags", { name: need(input, "name") });
  },
};

export default tagCreate;
