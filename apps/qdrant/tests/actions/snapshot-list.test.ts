import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/snapshot-list.ts";

const snapshots = ok([
  { name: "docs-2026-08-16.snapshot", size: 100, creation_time: "2026-08-16T09:00:00" },
  { name: "docs-2026-08-18.snapshot", size: 250, creation_time: "2026-08-18T09:00:00" },
]);

/** The question that decides whether a destructive operation is recoverable. */
Deno.test("snapshot-list: returns the newest one, which Qdrant puts last", async () => {
  const { ctx, calls } = mockCtx([snapshots], { display });
  const result = await action.execute!({ collection: "docs" }, ctx) as {
    count: number;
    latest: { name: string };
  };
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections/docs/snapshots");
  assertEquals(result.count, 2);
  assertEquals(result.latest.name, "docs-2026-08-18.snapshot");
});

/** Qdrant never expires snapshots, so the total is the disk nothing reclaims. */
Deno.test("snapshot-list: totals the bytes they occupy", async () => {
  const { ctx } = mockCtx([snapshots], { display });
  const result = await action.execute!({ collection: "docs" }, ctx) as { totalBytes: number };
  assertEquals(result.totalBytes, 350);
});

Deno.test("snapshot-list: no snapshots means no latest, and a zero total", async () => {
  const { ctx } = mockCtx([ok([])], { display });
  const result = await action.execute!({ collection: "docs" }, ctx) as {
    count: number;
    totalBytes: number;
    latest?: unknown;
  };
  assertEquals(result.count, 0);
  assertEquals(result.totalBytes, 0);
  assertEquals(result.latest, undefined);
});

Deno.test("snapshot-list: a sizeless entry does not turn the total into NaN", async () => {
  const { ctx } = mockCtx([ok([{ name: "a" }, { name: "b", size: 10 }])], { display });
  const result = await action.execute!({ collection: "docs" }, ctx) as { totalBytes: number };
  assertEquals(result.totalBytes, 10);
});

Deno.test("snapshot-list: needs a collection", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "collection");
  assertEquals(calls.length, 0);
});

Deno.test("snapshot-list: says nothing expires them", () => {
  assert(/never expires them/.test(action.description!), action.description);
});
