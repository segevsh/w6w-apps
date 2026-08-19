import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-count.ts";

const D = { display: { host: "https://nocodb.internal" } };

/** One request instead of four hundred. */
Deno.test("record-count: asks the count endpoint", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { count: 412 },
    headers: { "x-ratelimit-remaining": "59" },
  }], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/tables/mtbl1/records/count");
  assertEquals(result.count, 412);
  assertEquals(result.isEmpty, false);
  assertEquals(result.requestsRemaining, 59);
});

/** Zero is a plausible answer, which is what makes the filter trap quiet here. */
Deno.test("record-count: a filtered zero gets a second look", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { count: 0 } }], D);
  const result = await action.execute(
    { tableId: "mtbl1", where: "(Status,eq,Nope)" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.isEmpty, true);
  assert(
    logs.some((l) => /returns zero rather than an error/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("record-count: an unfiltered zero says nothing", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { count: 0 } }], D);
  await action.execute({ tableId: "mtbl1" }, ctx);
  assertEquals(logs.length, 0);
});

Deno.test("record-count: refuses a spaced filter", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ tableId: "mtbl1", where: "(A, eq, b)" }, ctx),
    Error,
    "NOTHING",
  );
  assertEquals(calls.length, 0);
});
