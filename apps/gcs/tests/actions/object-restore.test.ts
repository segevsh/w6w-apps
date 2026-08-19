import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-restore.ts";

const restored = {
  status: 200,
  body: { name: "logs/a.log", generation: "1700000000009999", size: "1024" },
};

Deno.test("object-restore: posts to the restore path with the generation", async () => {
  const { ctx, calls } = mockCtx([restored]);
  const result = await action.execute(
    { bucket: "uploads", object: "logs/a.log", generation: "1700000000000001" },
    ctx,
  ) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/storage/v1/b/uploads/o/logs%2Fa.log/restore");
  assertEquals(url.searchParams.get("generation"), "1700000000000001");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.name, "logs/a.log");
});

/** There is nothing to restore without naming which version. */
Deno.test("object-restore: the generation is required, and says which listing shows it", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ bucket: "uploads", object: "logs/a.log" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`generation` is required/.test(message), message);
  assert(/`softDeleted` on lists deleted objects/.test(message), message);
  assert(/`versions` on lists overwritten ones/.test(message), message);
  assertEquals(calls.length, 0);
});

/** A restore is additive: nothing is displaced. */
Deno.test("object-restore: the restored copy gets a NEW generation", async () => {
  const { ctx } = mockCtx([restored]);
  const result = await action.execute(
    { bucket: "uploads", object: "logs/a.log", generation: "1700000000000001" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.restoredFrom, "1700000000000001");
  assertEquals(result.generation, "1700000000009999");
  assert(result.generation !== result.restoredFrom, "restoring does not revive the old id");
  assert(/becomes a new current version/.test(action.description!), action.description);
});

Deno.test("object-restore: the ACL can be carried over", async () => {
  const { ctx, calls } = mockCtx([restored]);
  await action.execute({
    bucket: "uploads",
    object: "logs/a.log",
    generation: "1",
    copySourceAcl: true,
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("copySourceAcl"), "true");

  const plain = mockCtx([restored]);
  await action.execute(
    { bucket: "uploads", object: "logs/a.log", generation: "1" },
    plain.ctx,
  );
  assertEquals(new URL(plain.calls[0].url).searchParams.get("copySourceAcl"), null);
});

/** Outside the window there is nothing to bring back. */
Deno.test("object-restore: a generation that no longer exists surfaces the 404", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: { message: "No such object" } } }]);
  let message = "";
  try {
    await action.execute({ bucket: "uploads", object: "a.log", generation: "1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/404/.test(message), message);
});

Deno.test("object-restore: logs which generation it restored from", async () => {
  const { ctx, logs } = mockCtx([restored]);
  await action.execute(
    { bucket: "uploads", object: "logs/a.log", generation: "1700000000000001" },
    ctx,
  );
  assertEquals(logs[0].data, { name: "logs/a.log", restoredFrom: "1700000000000001" });
});
