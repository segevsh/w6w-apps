import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import projectList from "../actions/project-list.ts";

/** The kit's snapshot cap; a walk that reaches it fails loudly instead of missing projects. */
const MAX_ROWS = 5000;
const PAGE_SIZE = 100;
/** 5000 rows / 100 per page, plus one page to prove the cap was crossed. */
const MAX_PAGES = 51;

/**
 * Shape (c): the organization's projects are walked page by page (`page_limit`, `page_start_id` from
 * `pagination.next_page_start_id`) and diffed with `pollSnapshot`. Hubstaff's OpenAPI document gives
 * the endpoint no sort parameter and no order, so nothing here depends on one.
 */
export default {
  key: "new-project",
  title: "New Project",
  description: "The run gets each new project.",
  params: [{ key: "organizationId", label: "Organization ID", type: "number", required: true }],
  output: [{ key: "id", type: "number", label: "Project ID" }],
  sample: { id: 1, name: "Website" },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx: HookContext) {
    const rows: Array<{ key: string; values: unknown }> = [];
    let start: number | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await projectList.execute({
        organization_id: params.organizationId,
        status: "all",
        page_limit: PAGE_SIZE,
        page_start_id: start,
      }, ctx) as {
        projects?: Array<{ id?: unknown }>;
        pagination?: { next_page_start_id?: number | null };
      };
      for (const p of res.projects ?? []) rows.push({ key: String(p.id ?? ""), values: p });
      start = res.pagination?.next_page_start_id ?? undefined;
      if (start === undefined) break;
    }
    if (start !== undefined) {
      throw new Error(
        `new-project: more than ${MAX_ROWS} projects; the snapshot trigger cannot cover it`,
      );
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false },
      maxRows: MAX_ROWS,
    });
    return { events: events.map((e) => e.values), nextState };
  },
} satisfies TriggerDefinition<{ organizationId: number }>;
