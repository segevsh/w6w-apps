import { assert, assertEquals, assertRejects } from "@std/assert";
import entityCount from "../../actions/entity-count.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://webservices2.autotask.net/atservicesrest/V1.0";
const display = { display: { zone: "2" } };
const run = (a: { execute?: unknown }, input: unknown, ctx: unknown) =>
  (a.execute as (i: unknown, c: unknown) => Promise<Record<string, unknown>>)(input, ctx);

Deno.test("entity-count: POSTs to /query/count and returns queryCount", async () => {
  const { ctx, calls } = mockCtx([{ body: { queryCount: 42 } }], display);
  const out = await run(entityCount, {
    entity: "Tickets",
    filter: [{ op: "eq", field: "status", value: 1 }],
  }, ctx);
  assertEquals(out, { count: 42 });
  assertEquals(calls[0].url, `${BASE}/Tickets/query/count`);
  assertEquals(JSON.parse(calls[0].body!), { filter: [{ op: "eq", field: "status", value: 1 }] });
  await assertRejects(() => run(entityCount, { entity: "Nope" }, ctx), Error, "not a queryable");
});

Deno.test("every action reads the connection's zone: zone 14 goes to webservices14", async () => {
  const { ctx, calls } = mockCtx([{ body: { queryCount: 1 } }], { display: { zone: "14" } });
  await run(entityCount, { entity: "Tickets" }, ctx);
  assert(calls[0].url.startsWith("https://webservices14.autotask.net/"));
});
