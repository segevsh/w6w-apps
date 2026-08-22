import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-delete.ts";

const bucketConfig = (options: { versioning?: boolean; softDeleteSeconds?: number }) => ({
  status: 200,
  body: {
    versioning: { enabled: options.versioning === true },
    ...(options.softDeleteSeconds
      ? { softDeletePolicy: { retentionDurationSeconds: String(options.softDeleteSeconds) } }
      : {}),
  },
});

const object = (storageClass = "STANDARD") => ({ status: 200, body: { storageClass } });

Deno.test("object-delete: reads the bucket and the object, then deletes", async () => {
  const { ctx, calls } = mockCtx([bucketConfig({}), object(), { status: 204 }]);
  const result = await action.execute(
    { bucket: "uploads", object: "logs/a.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[2].method, "DELETE");
  assertEquals(
    new URL(calls[2].url).pathname,
    "/storage/v1/b/uploads/o/logs%2Fa.log",
  );
  assertEquals(result.deleted, true);
});

/**
 * "I deleted it and it still costs money" and "I deleted it and there is no
 * way back" are both normal; which one is a bucket setting nobody looked at.
 */
Deno.test("object-delete: reports which of the three deletes this was", async () => {
  const versioned = mockCtx([bucketConfig({ versioning: true }), object(), { status: 204 }]);
  const kept = await action.execute(
    { bucket: "uploads", object: "a.log" },
    versioned.ctx,
  ) as Record<string, unknown>;
  assertEquals(kept.recoverable, true);
  assert(/previous generation is retained/.test(String(kept.recoveryMethod)));

  const soft = mockCtx([bucketConfig({ softDeleteSeconds: 604800 }), object(), { status: 204 }]);
  const retained = await action.execute(
    { bucket: "uploads", object: "a.log" },
    soft.ctx,
  ) as Record<string, unknown>;
  assertEquals(retained.recoverable, true);
  assert(/`object-restore` brings it back/.test(String(retained.recoveryMethod)));

  const gone = mockCtx([bucketConfig({}), object(), { status: 204 }]);
  const final = await action.execute(
    { bucket: "uploads", object: "a.log" },
    gone.ctx,
  ) as Record<string, unknown>;
  assertEquals(final.recoverable, false);
  assertEquals(final.recoveryMethod, undefined);
  assertEquals(gone.logs[0].level, "warn");
  assert(/so it is gone/.test(gone.logs[0].message), gone.logs[0].message);
});

/** An irreversible delete is a warning; a recoverable one is not. */
Deno.test("object-delete: only the irreversible case warns", async () => {
  const { ctx, logs } = mockCtx([
    bucketConfig({ versioning: true }),
    object(),
    { status: 204 },
  ]);
  await action.execute({ bucket: "uploads", object: "a.log" }, ctx);
  assertEquals(logs[0].level, "info");
});

/** The minimum billed duration survives the object. */
Deno.test("object-delete: says deleting an archived object saves nothing", async () => {
  const { ctx } = mockCtx([bucketConfig({}), object("ARCHIVE"), { status: 204 }]);
  const result = await action.execute(
    { bucket: "uploads", object: "a.log" },
    ctx,
  ) as Record<string, unknown>;
  assert(/365 days/.test(String(result.earlyDeletionNote)), String(result.earlyDeletionNote));
  assert(/does not stop that charge/.test(String(result.earlyDeletionNote)));
});

Deno.test("object-delete: a STANDARD object has no early-deletion note", async () => {
  const { ctx } = mockCtx([bucketConfig({}), object(), { status: 204 }]);
  const result = await action.execute(
    { bucket: "uploads", object: "a.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.earlyDeletionNote, undefined);
});

/** Without it, a delete racing an overwrite removes the other writer's version. */
Deno.test("object-delete: a generation precondition is passed through", async () => {
  const { ctx, calls } = mockCtx([bucketConfig({}), object(), { status: 204 }]);
  await action.execute(
    { bucket: "uploads", object: "a.log", ifGenerationMatch: "1700000000000001" },
    ctx,
  );
  assertEquals(
    new URL(calls[2].url).searchParams.get("ifGenerationMatch"),
    "1700000000000001",
  );
});

/** A missing object should not stop the delete being attempted. */
Deno.test("object-delete: an unreadable object still deletes", async () => {
  const { ctx } = mockCtx([bucketConfig({}), { status: 404, body: {} }, { status: 204 }]);
  const result = await action.execute(
    { bucket: "uploads", object: "a.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.deleted, true);
  assertEquals(result.earlyDeletionNote, undefined);
});
