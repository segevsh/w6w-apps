import type { ActionDefinition } from "@w6w/types";
import { WorkDriveClient } from "../lib/client.ts";

interface Input {
  linkId: string;
}

/** `DELETE /links/{link_id}`. */
const shareLinkRevoke: ActionDefinition<Input> = {
  key: "share-link-revoke",
  type: "perform",
  resource: "link",
  title: "Revoke External Link",
  description: "Revoke (delete) an external share link.",
  idempotent: true,
  params: [{ key: "linkId", label: "Link ID", type: "string", required: true }],
  output: [{ key: "revoked", type: "boolean", label: "Link revoked" }],

  async execute(input, ctx) {
    await new WorkDriveClient(ctx).request("DELETE", `/links/${encodeURIComponent(input.linkId)}`);
    return { revoked: true };
  },
};

export default shareLinkRevoke;
