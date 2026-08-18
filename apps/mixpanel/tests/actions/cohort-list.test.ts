import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cohort-list.ts";

const conn = { display: { projectId: "123", region: "us" } };

/** A POST that reads — Mixpanel's shape for this route. */
Deno.test("cohort-list: POSTs to the cohorts list route", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 1, name: "Activated" }] }], conn);
  const out = await action.execute!({}, ctx) as { cohorts: unknown[] };
  assertEquals(out.cohorts.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/query/cohorts/list");
});
