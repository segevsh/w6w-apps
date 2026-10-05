import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  spaceId: string;
}

const projectSpaceRemove: ActionDefinition<Input> = {
  key: "project-space-remove",
  type: "perform",
  resource: "project",
  title: "Remove Project Space",
  description: "Remove a company space from a project.",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Project id (BSON ObjectId hex).",
    },
    {
      key: "spaceId",
      label: "Space ID",
      type: "string",
      required: true,
      hint: "Company space (named venue) id.",
    },
  ],
  output: [
    {
      key: "success",
      type: "boolean",
      label: "Whether the call succeeded (the API answers 204 No Content)",
    },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "DELETE",
      `/projects/${encodeId(input.projectId)}/spaces/${encodeId(input.spaceId)}`,
    );
    return result ?? { success: true };
  },
};

export default projectSpaceRemove;
