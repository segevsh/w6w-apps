import type { ActionDefinition } from "@w6w/types";
import { WorkflowyClient } from "../lib/client.ts";

interface Target {
  key: string;
  type: string;
  name: string | null;
}

/** `GET /api/v1/targets` — shortcut keys plus system targets such as `inbox`. */
const targetsList: ActionDefinition<Record<string, never>> = {
  key: "targets-list",
  type: "read",
  resource: "target",
  title: "List Targets",
  description: "List the shortcut keys and system targets (such as inbox) usable as parent ids.",
  params: [],
  output: [
    { key: "targets", type: "array", label: "Targets: key, type (shortcut|system), name" },
    { key: "count", type: "number", label: "Number of targets" },
  ],

  async execute(_input, ctx) {
    const res = await new WorkflowyClient(ctx).request<{ targets?: Target[] }>("/targets");
    const targets = res.targets ?? [];
    return { targets, count: targets.length };
  },
};

export default targetsList;
