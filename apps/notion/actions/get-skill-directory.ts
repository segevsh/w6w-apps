import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  id: string;
}

/** GET /v1/ai/skills/{id} — get-skill-directory. */
const action: ActionDefinition<Input> = {
  key: "get-skill-directory",
  type: "read",
  resource: "agentSkill",
  title: "Get Skill Directory",
  description: "Get a skill directory.",
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
    "hint": "Identifier for a Notion skill page.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/ai/skills/${pathId(input.id)}`, {
      method: "GET",
    });
  },
};

export default action;
