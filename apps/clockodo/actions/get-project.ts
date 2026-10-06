import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, intId } from "../lib/client.ts";

interface Input {
  id: string;
}

const getProject: ActionDefinition<Input> = {
  key: "get-project",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Read one project by id (GET /v4/projects/{id}).",
  params: [
    {
      key: "id",
      label: "Project ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "data", type: "object", label: "Project" },
  ],

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const body = await new ClockodoClient(ctx).call(`/v4/projects/${id}`);
    return { data: body.data ?? null };
  },
};

export default getProject;
