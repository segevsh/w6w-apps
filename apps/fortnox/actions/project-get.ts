import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  projectNumber: string;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one project by project number.",
  params: [
    {
      "key": "projectNumber",
      "label": "Project number",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "Project",
      "type": "object",
      "label": "Project record",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(`/3/projects/${seg(input.projectNumber)}`);
  },
};

export default projectGet;
