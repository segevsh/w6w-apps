import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, ProductiveClient } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Create a board on a project (`POST /boards`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  name: string;
  projectId: number;
  hidden?: boolean;
  position?: number;
}

const boardCreate: ActionDefinition<Input> = {
  key: "board-create",
  type: "perform",
  resource: "board",
  title: "Create Board",
  description: "Create a board on a project (`POST /boards`).",
  idempotent: false,
  params: [
    { "key": "name", "label": "Name", "type": "string", "required": true },
    { "key": "projectId", "label": "Project ID", "type": "number", "required": true },
    { "key": "hidden", "label": "Hidden", "type": "boolean" },
    { "key": "position", "label": "Position", "type": "number" },
  ],
  output: resourceOutput("Board"),

  async execute(input, ctx) {
    const attrs = {
      "name": input.name,
      "project_id": input.projectId,
      "hidden": input.hidden,
      "position": input.position,
    };
    return await new ProductiveClient(ctx).one(`/boards`, {
      method: "POST",
      body: jsonApiBody("boards", attrs),
    });
  },
};

export default boardCreate;
