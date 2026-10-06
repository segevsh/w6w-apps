import type { ActionDefinition } from "@w6w/types";
import { DubClient, seg } from "../lib/client.ts";

interface Input {
  linkId: string;
}

/** `DELETE /links/{linkId}`. */
const linkDelete: ActionDefinition<Input> = {
  key: "link-delete",
  type: "perform",
  resource: "link",
  title: "Delete Link",
  description: "Permanently delete a short link and its click history.",
  idempotent: true,
  params: [
    {
      key: "linkId",
      label: "Link ID",
      type: "string",
      required: true,
      hint: "The link's ID, or its external ID prefixed with `ext_`.",
    },
  ],
  output: [{ key: "id", type: "string", label: "ID of the deleted link" }],

  execute(input, ctx) {
    return new DubClient(ctx).request("DELETE", `/links/${seg(input.linkId)}`);
  },
};

export default linkDelete;
