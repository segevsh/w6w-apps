import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { labelIdParam } from "../lib/params.ts";

interface Input {
  labelId: number;
}

const labelDelete: ActionDefinition<Input> = {
  key: "label-delete",
  type: "perform",
  resource: "label",
  title: "Delete Label",
  description: "Permanently delete a Label. It is removed from every Story and Epic it tagged.",
  idempotent: true,
  params: [labelIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const status = await new ShortcutClient(ctx).delete(`/labels/${input.labelId}`);
    return { status };
  },
};

export default labelDelete;
