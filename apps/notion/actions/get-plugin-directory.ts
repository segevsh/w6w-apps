import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  id: string;
}

/** GET /v1/ai/plugins/{id} — get-plugin-directory. */
const action: ActionDefinition<Input> = {
  key: "get-plugin-directory",
  type: "read",
  resource: "agentSkill",
  title: "Get Plugin Directory",
  description: "Get a plugin directory.",
  output: [{ "key": "id", "type": "string", "label": "Id" }, {
    "key": "version_id",
    "type": "string",
    "label": "Version id",
  }, { "key": "url", "type": "string", "label": "Url" }],
  params: [{
    "key": "id",
    "label": "ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/ai/plugins/${pathId(input.id)}`, {
      method: "GET",
    });
  },
};

export default action;
