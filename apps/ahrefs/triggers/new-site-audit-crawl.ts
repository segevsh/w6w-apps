import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/site-audit-project-list.ts";

/**
 * One health-score row per Site Audit project (free endpoint, bounded by the
 * account's project count). A finished crawl changes the row's `date` /
 * `health_score`, so the snapshot reports it as `updated`; a project that
 * gets its first crawl after the seed arrives as `added`.
 * Source: https://docs.ahrefs.com/openapi.json `/site-audit/projects`
 * (verified 2026-11-10).
 */
const trigger: TriggerDefinition = {
  key: "new-site-audit-crawl",
  title: "New Site Audit Crawl",
  description:
    "The run gets a project's Site Audit health score each time a new crawl finishes (or a new audited project appears), read through site-audit-project-list.",
  params: action.params,
  output: [
    { key: "change", type: "string", label: "Change (added or updated)" },
    { key: "key", type: "string", label: "Project ID" },
    {
      key: "values",
      type: "object",
      label: "Health score row (date, health_score, status, project_name)",
    },
  ],
  sample: {
    change: "updated",
    key: "101",
    values: {
      project_id: "101",
      project_name: "example.com",
      date: "2026-11-09T10:00:00Z",
      health_score: 92,
      status: "Completed",
    },
  },
  minIntervalMs: 900_000,
  async poll({ params, state }, ctx) {
    const result = await action.execute(params, ctx) as { healthscores?: unknown[] };
    return await pollSnapshot({
      state,
      maxRows: 5000,
      emit: { added: true, updated: true },
      rows: (result.healthscores ?? []).map((row) => ({
        key: String((row as { project_id?: unknown }).project_id ?? ""),
        values: row,
      })),
    });
  },
};

export default trigger;
