import type { ActionDefinition } from "@w6w/types";
import { HousecallClient } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `POST /tags` — create a tag.
 *
 * The reference leaves `name` out of the body's `required` list, which is
 * almost certainly an omission rather than a feature — a nameless tag has no
 * way to be selected. It is marked required here as a form constraint only: the
 * effect is that this action never sends an empty body, which is strictly safer
 * than discovering what the API does with one.
 */
interface Input {
  name: string;
  companyId?: string;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag. Use Get Tags first if it may already exist — names are not unique.",
  // No uniqueness constraint is documented, so a retry may create a duplicate.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json("/tags", {
      method: "POST",
      companyId: input.companyId,
      body: { name: input.name },
    });
  },
};

export default tagCreate;
