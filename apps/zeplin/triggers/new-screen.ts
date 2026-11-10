import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listScreens from "../actions/list-screens.ts";

/** `limit` is documented as 1-100 (default 30) with an `offset`. */
const PAGE = 100;
const MAX_ROWS = 5000;

/**
 * `GET /v1/projects/{project_id}/screens` through `list-screens`, read page by page with
 * `limit`/`offset`. Zeplin documents `sort` as "by their `section` or their `created` date" but not
 * its direction (https://docs.zeplin.dev/reference/getprojectscreens.md), so the trigger relies on
 * no order: a project's screens are snapshot-diffed (additions only; more than 5000 throws).
 */
const trigger: TriggerDefinition = {
  key: "new-screen",
  title: "New Screen",
  description: "The run gets each screen newly added to a Zeplin project.",
  params: [{
    key: "projectId",
    label: "Project ID",
    type: "string",
    required: true,
    hint: "24-character Zeplin project id.",
  }],
  output: [
    { key: "id", type: "string", label: "Screen ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created", type: "number", label: "Created (unix seconds)" },
  ],
  sample: { id: "sample-screen-id", name: "Login", created: 1517184000 },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const projectId = String(params.projectId ?? "");
    const rows: Array<{ key: string; values: unknown }> = [];
    for (let offset = 0;; offset += PAGE) {
      if (offset >= MAX_ROWS) throw new Error(`Zeplin screen snapshot exceeds ${MAX_ROWS} rows`);
      const out = await listScreens.execute({ projectId, limit: PAGE, offset }, ctx) as {
        items?: unknown[];
        next_offset?: number | null;
      };
      const page = out.items ?? [];
      for (const value of page) {
        rows.push({ key: String((value as { id?: unknown }).id ?? ""), values: value });
      }
      if (page.length < PAGE || out.next_offset === null || out.next_offset === undefined) break;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
      maxRows: MAX_ROWS,
    });
    return { events: events.map((event) => event.values), nextState };
  },
};

export default trigger;
