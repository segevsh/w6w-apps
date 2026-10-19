import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  botId: string;
  spaceId: string;
}

/** DELETE /admin/v1/spaces/{space_id}/personal_access_tokens/{bot_id} — revoke-personal-access-token. */
const action: ActionDefinition<Input> = {
  key: "admin-revoke-personal-access-token",
  type: "perform",
  resource: "admin",
  title: "Admin: Revoke a personal access token in a workspace",
  description:
    "Admin: Revoke a personal access token in a workspace. Requires an Enterprise organization bot token.",
  output: [{ "key": "object", "type": "string", "label": "Object" }],
  idempotent: false,
  params: [{
    "key": "botId",
    "label": "Bot ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(
      `/spaces/${pathId(input.spaceId)}/personal_access_tokens/${pathId(input.botId)}`,
      {
        method: "DELETE",
        admin: true,
      },
    );
  },
};

export default action;
