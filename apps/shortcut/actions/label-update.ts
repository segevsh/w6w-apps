import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";
import { colorParam, labelIdParam } from "../lib/params.ts";

interface Input {
  labelId: number;
  name?: string;
  description?: string;
  color?: string;
  archived?: boolean;
}

const labelUpdate: ActionDefinition<Input> = {
  key: "label-update",
  type: "perform",
  resource: "label",
  title: "Update Label",
  description: "Update an existing Label. Only the fields you set are changed.",
  idempotent: true,
  params: [
    labelIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    colorParam,
    { key: "archived", label: "Archived", type: "boolean" },
  ],
  output: [{ key: "data", type: "object", label: "The updated Label" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).put(
      `/labels/${input.labelId}`,
      compact({
        name: input.name,
        description: input.description,
        color: input.color,
        archived: input.archived,
      }),
    );
  },
};

export default labelUpdate;
