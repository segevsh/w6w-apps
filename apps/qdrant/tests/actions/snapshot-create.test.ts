import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/snapshot-create.ts";

const snapshot = ok({
  name: "docs-2026-08-18.snapshot",
  size: 84_213_760,
  creation_time: "2026-08-18T09:00:00",
});

/**
 * A snapshot that has not finished is not a backup, and the reason to take one
 * is usually that something destructive comes next.
 */
Deno.test("snapshot-create: waits for the snapshot by default", async () => {
  const { ctx, calls } = mockCtx([snapshot], { display });
  const result = await action.execute!({ collection: "docs" }, ctx) as { name: string };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://xyz.cloud.qdrant.io:6333/collections/docs/snapshots",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).searchParams.get("wait"), "true");
  assertEquals(result.name, "docs-2026-08-18.snapshot");
});

Deno.test("snapshot-create: waiting can be turned off for a very large collection", async () => {
  const { ctx, calls } = mockCtx([snapshot], { display });
  await action.execute!({ collection: "docs", wait: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("wait"), "false");
});

Deno.test("snapshot-create: logs the name and size, which is what a retention job needs", async () => {
  const { ctx, logs } = mockCtx([snapshot], { display });
  await action.execute!({ collection: "docs" }, ctx);
  assertEquals(logs[0].data, {
    collection: "docs",
    snapshot: "docs-2026-08-18.snapshot",
    bytes: 84_213_760,
  });
});

Deno.test("snapshot-create: needs a collection", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "collection");
  assertEquals(calls.length, 0);
});

/**
 * Each call makes another file, so this is not idempotent — and the snapshot
 * lands on the node, which protects against a bad delete and not against
 * losing the volume.
 */
Deno.test("snapshot-create: is declared non-idempotent and says where the file lands", () => {
  assertEquals(action.idempotent, false);
  assert(/Stored on the node/.test(action.description!), action.description);
});
