import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope, type ManychatGrowthTool } from "../lib/client.ts";

/**
 * Every Growth Tool on the Page — the widgets, ref links, comment triggers and
 * overlays that opt people in.
 *
 * `GET /fb/page/getGrowthTools` → `{ status, data: [{ id, name, type }] }`.
 *
 * ## Why there is no `list-widgets` beside it
 *
 * Manychat publishes a second operation, `GET /fb/page/getWidgets`, returning the
 * **same `Growth Tools` schema** — and its own description reads, in full:
 *
 *     "***Limit:*** 100 queries per second.<br>Use getGrowthTools instead."
 *
 * A vendor-declared deprecation with a named replacement is not a judgement call,
 * so `getWidgets` is deliberately not shipped. "Widget" was the old name for the
 * same object; the path outlived the noun.
 */
const listGrowthTools: ActionDefinition<Record<string, never>> = {
  key: "list-growth-tools",
  type: "read",
  resource: "growth-tool",
  title: "List Growth Tools",
  description:
    "Every Growth Tool (opt-in widget, ref link, comment trigger, overlay) on the Page " +
    "(GET /fb/page/getGrowthTools) — `{ id, name, type }`.",
  params: [],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "array", label: "Growth tools" },
  ],

  execute(_input, ctx) {
    return new ManychatClient(ctx).get<ManychatEnvelope<ManychatGrowthTool[]>>(
      "/fb/page/getGrowthTools",
    );
  },
};

export default listGrowthTools;
