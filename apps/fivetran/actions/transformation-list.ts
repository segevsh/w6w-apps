import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/transformations` — the dbt jobs Fivetran runs.
 *
 * Each one is either a **Quickstart package** — Fivetran's own prebuilt models
 * for a source, which appear without anybody writing dbt — or a job against a
 * **transformation project** pointed at your repository.
 *
 * The distinction matters when something changes unexpectedly: a Quickstart
 * package's models are versioned by Fivetran and can be upgraded, so a model
 * that started producing different numbers may have been upgraded rather than
 * edited by anybody on your team.
 *
 * `status` is what a monitoring workflow reads, and this action separates the
 * failing ones out because a transformation that has been failing for a week is
 * a warehouse full of stale tables that still look populated.
 */
const action: ActionDefinition = {
  key: "transformation-list",
  type: "read",
  resource: "transformation",
  title: "List transformations",
  description:
    "The dbt jobs Fivetran runs — your own project or its prebuilt Quickstart packages, which " +
    "Fivetran versions and can upgrade under you.",
  params: [...LIST_PARAMS],
  output: [
    { key: "transformations", type: "array", label: "Transformations" },
    { key: "count", type: "number", label: "Transformations returned" },
    { key: "failing", type: "array", label: "Ones whose last run did not succeed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new FivetranClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll<{ id?: string; status?: string }>(
      "/v1/transformations",
      {},
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );

    const failing = page.items
      .filter((t) => /fail|error/i.test(String(t?.status ?? "")))
      .map((t) => String(t?.id ?? ""));

    return { transformations: page.items, count: page.items.length, failing };
  },
};

export default action;
