import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  dateId: string;
}

const projectDateDelete: ActionDefinition<Input> = {
  key: "project-date-delete",
  type: "perform",
  resource: "project",
  title: "Delete Project Date",
  description: "Delete a project date.",
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
      key: "dateId",
      label: "Date ID",
      type: "string",
      required: true,
      hint: "Additional-date id.",
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
      `/projects/${encodeId(input.projectId)}/dates/${encodeId(input.dateId)}`,
    );
    return result ?? { success: true };
  },
};

export default projectDateDelete;
