import type { ActionDefinition } from "@w6w/types";
import { VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/tests/{testId}/entities` — **what** is failing, not just that
 * something is.
 *
 * This is the call that makes a Vanta alert actionable. "Production databases
 * are not all encrypted" is a status; this returns the three databases. Without
 * it a workflow can only forward a red light to a human who then has to open
 * Vanta anyway.
 *
 * Each entity is a real resource from a connected integration — an S3 bucket, a
 * repository, a laptop, a user account — with the identifiers needed to open a
 * ticket against it or fix it directly.
 *
 * The list can be long: a device-compliance test failing across a company has
 * one entity per laptop, which is exactly why it is paginated and separate from
 * `test-get`.
 */
const action: ActionDefinition = {
  key: "test-entity-list",
  type: "read",
  resource: "test",
  title: "List the entities failing a test",
  description:
    "The actual resources causing a test to fail — the buckets, repositories, laptops or " +
    "accounts. Without this a workflow can only forward a red light to a human.",
  params: [
    { key: "testId", label: "Test ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "entities", type: "array", label: "The failing resources" },
    { key: "count", type: "number", label: "Entities returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const testId = String(p.testId ?? "").trim();
    if (!testId) throw new Error("`testId` is required");

    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll(
      `/tests/${encodeURIComponent(testId)}/entities`,
      {},
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    ctx.log("info", "read the entities failing a Vanta test", {
      testId,
      count: page.items.length,
    });
    return { entities: page.items, count: page.items.length, hasNextPage: page.hasNextPage };
  },
};

export default action;
