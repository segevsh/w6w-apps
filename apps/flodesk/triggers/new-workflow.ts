import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listWorkflows from "../actions/list-workflows.ts";

const PER_PAGE = 100;
const MAX_PAGES = 50;

/**
 * Workflows are an account-configuration collection (tens). `GET /v1/workflows` takes `page`
 * (default 1) and `perPage` (camelCase, default 10) and answers `{ data, meta.total_pages }`
 * (https://developers.flodesk.com/ , `listWorkflows`, verified 2026-11-10). The whole set is read each
 * check through `list-workflows` and diffed; more than 5000 workflows fails the check with an error
 * naming the cap (the snapshot kit's row limit) instead of silently dropping rows.
 */
const trigger: TriggerDefinition = {
  key: "new-workflow",
  title: "New Workflow",
  description: "The run gets each workflow newly created in the Flodesk account.",
  output: [
    { key: "id", type: "string", label: "Workflow ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "5f8a1c0e9b2d4e6f7a8b9c03", name: "Welcome series" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const workflows: Array<{ id?: unknown }> = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const out = await listWorkflows.execute({ page, perPage: PER_PAGE }, ctx) as {
        meta?: { total_pages?: number };
        data?: Array<{ id?: unknown }>;
      };
      workflows.push(...(Array.isArray(out?.data) ? out.data : []));
      if (Number(out?.meta?.total_pages ?? 1) <= page) break;
      if (page === MAX_PAGES) {
        throw new Error(
          `Flodesk account has more than ${
            MAX_PAGES * PER_PAGE
          } workflows; the New Workflow trigger is capped there`,
        );
      }
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: workflows.map((workflow) => ({ key: String(workflow.id ?? ""), values: workflow })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
