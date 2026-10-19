import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  legalHoldId: string;
  legalHoldExportId?: string;
  requestingUserId: string;
  spaceId?: string;
}

/** POST /admin/v1/legal_holds/{legal_hold_id}/export — export-legal-hold. */
const action: ActionDefinition<Input> = {
  key: "admin-export-legal-hold",
  type: "perform",
  resource: "admin",
  title: "Admin: Export a legal hold",
  description: "Admin: Export a legal hold. Requires an Enterprise organization bot token.",
  output: [{ "key": "legal_hold_export_id", "type": "string", "label": "Legal hold export id" }],
  idempotent: false,
  params: [
    {
      "key": "legalHoldId",
      "label": "Legal Hold ID",
      "type": "string",
      "required": true,
      "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
    },
    { "key": "legalHoldExportId", "label": "Legal Hold Export ID", "type": "string" },
    {
      "key": "requestingUserId",
      "label": "Requesting User ID",
      "type": "string",
      "required": true,
    },
    { "key": "spaceId", "label": "Space ID", "type": "string" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/legal_holds/${pathId(input.legalHoldId)}/export`, {
      method: "POST",
      admin: true,
      body: {
        "legal_hold_export_id": input.legalHoldExportId,
        "requesting_user_id": input.requestingUserId,
        "space_id": input.spaceId,
      },
    });
  },
};

export default action;
