import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, intId } from "../lib/client.ts";

interface Input {
  id: string;
  completed?: boolean;
}

const completeProject: ActionDefinition<Input> = {
  key: "complete-project",
  type: "perform",
  resource: "project",
  title: "Complete Project",
  description:
    "Mark a project completed, or reopen it with `completed: false` (PUT /v4/projects/{id}/complete).",
  params: [
    {
      key: "id",
      label: "Project ID",
      type: "string",
      required: true,
    },
    {
      key: "completed",
      label: "Completed",
      type: "boolean",
      hint: "Defaults to true.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The updated project" },
  ],
  idempotent: true,

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const body = await new ClockodoClient(ctx).call(`/v4/projects/${id}/complete`, {
      method: "PUT",
      body: { completed: input.completed ?? true },
    });
    return { data: body.data ?? null };
  },
};

export default completeProject;
