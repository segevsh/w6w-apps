import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/point-upsert.ts";

const accepted = ok({ operation_id: 7, status: "completed" });

/** Qdrant's `wait` defaults to false; a sequential workflow assumes otherwise. */
Deno.test("point-upsert: waits for the write by default", async () => {
  const { ctx, calls } = mockCtx([accepted], { display });
  const result = await action.execute!({
    collection: "docs",
    points: '[{"id":1,"vector":[0.1,0.2],"payload":{"tenant":"acme"}}]',
  }, ctx) as { count: number };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://xyz.cloud.qdrant.io:6333/collections/docs/points",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).searchParams.get("wait"), "true");
  assertEquals(result.count, 1);
});

Deno.test("point-upsert: waiting can be turned off", async () => {
  const { ctx, calls } = mockCtx([accepted], { display });
  await action.execute!({
    collection: "docs",
    points: '[{"id":1,"vector":[0.1]}]',
    wait: false,
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("wait"), "false");
});

/**
 * Upsert replaces a point entirely, so a point with no vector would erase the
 * vector it had.
 */
Deno.test("point-upsert: a point without a vector is refused, and says why", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ collection: "docs", points: '[{"id":1,"payload":{"a":1}}]' }, ctx),
    Error,
    "payload-set",
  );
  assertEquals(calls.length, 0);
});

Deno.test("point-upsert: a point without an id is refused", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs", points: '[{"vector":[0.1]}]' }, ctx),
    Error,
    "no `id`",
  );
});

Deno.test("point-upsert: an empty list is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs", points: "[]" }, ctx),
    Error,
    "at least one point",
  );
  assertEquals(calls.length, 0);
});

/** The points are the caller's data. */
Deno.test("point-upsert: logs a count, never the points", async () => {
  const { ctx, logs } = mockCtx([accepted], { display });
  await action.execute!({
    collection: "docs",
    points: '[{"id":1,"vector":[0.1],"payload":{"secret":"tuna"}}]',
  }, ctx);
  assert(!JSON.stringify(logs).includes("tuna"), JSON.stringify(logs));
  assertEquals(logs[0].data, { collection: "docs", count: 1 });
});

Deno.test("point-upsert: says it replaces rather than merges", () => {
  assert(/REPLACE/.test(action.description!), action.description);
});
