import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/log-list.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("log-list: a query search uses ordinary paging", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ log_id: "l1" }] }], conn);
  await action.execute!({ query: 'type:"fp"', take: 25 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("q"), 'type:"fp"');
  assertEquals(q.get("per_page"), "25");
  assertEquals(q.get("from"), null);
});

/** Checkpoint paging is the only way past 1,000 entries. */
Deno.test("log-list: a `from` switches to checkpoint paging", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ log_id: "l2" }] }], conn);
  const out = await action.execute!({ from: "l1", take: 10 }, ctx) as { lastLogId: string };
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("from"), "l1");
  assertEquals(q.get("take"), "10");
  assertEquals(q.get("q"), null);
  // The cursor for the next run.
  assertEquals(out.lastLogId, "l2");
});

Deno.test("log-list: take is capped at Auth0's maximum of 100", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({ from: "l1", take: 500 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("take"), "100");
});

/** The type codes are opaque and are how a security workflow filters. */
Deno.test("log-list: the query hint decodes the type codes", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) =>
    p.key === "query"
  )!;
  assert(/failed password/.test(p.hint!), p.hint);
});
