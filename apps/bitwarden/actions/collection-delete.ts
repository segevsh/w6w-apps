import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "collection-delete",
  type: "perform",
  resource: "collection",
  title: "Delete a collection",
  description:
    "Permanently delete a collection. Items in it are not deleted. Bitwarden answers an empty 200, and 404 if the id is unknown (including a repeat delete).",
  idempotent: true,
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when Bitwarden accepted the delete" },
    { key: "id", type: "string", label: "The id that was deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.collectionId, "collectionId");
    await new BitwardenClient(ctx).request(`/collections/${id}`, { method: "DELETE" });
    return { deleted: true, id };
  },
};

export default action;
