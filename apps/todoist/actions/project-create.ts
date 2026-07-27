import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  name: string;
  parentId?: string;
  color?: string;
  isFavorite?: boolean;
  viewStyle?: "list" | "board";
}

/** POST /projects — create a new project. */
const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a new Todoist project.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "parentId",
      label: "Parent project ID",
      type: "string",
      hint: "Set to nest under a project.",
    },
    {
      key: "color",
      label: "Color",
      type: "string",
      hint: "A Todoist color name, e.g. `berry_red`.",
    },
    { key: "isFavorite", label: "Favorite", type: "boolean" },
    {
      key: "viewStyle",
      label: "View style",
      type: "select",
      options: [
        { value: "list", label: "List" },
        { value: "board", label: "Board" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    const client = new TodoistClient(ctx);
    const body: Record<string, unknown> = { name: input.name };
    if (input.parentId !== undefined) body.parent_id = input.parentId;
    if (input.color !== undefined) body.color = input.color;
    if (input.isFavorite !== undefined) body.is_favorite = input.isFavorite;
    if (input.viewStyle !== undefined) body.view_style = input.viewStyle;

    return client.request("/projects", { method: "POST", body });
  },
};

export default projectCreate;
