import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";
import { colorParam } from "../lib/params.ts";

interface Input {
  name: string;
  description?: string;
  color?: string;
  externalId?: string;
}

const labelCreate: ActionDefinition<Input> = {
  key: "label-create",
  type: "perform",
  resource: "label",
  title: "Create Label",
  description: "Create a new Label.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    colorParam,
    { key: "externalId", label: "External ID", type: "string" },
  ],
  output: [{ key: "data", type: "object", label: "The created Label" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).post(
      "/labels",
      compact({
        name: input.name,
        description: input.description,
        color: input.color,
        external_id: input.externalId,
      }),
    );
  },
};

export default labelCreate;
