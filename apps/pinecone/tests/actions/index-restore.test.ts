import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-restore.ts";

/** A restore creates a NEW index; it never overwrites. */
Deno.test("index-restore: posts the new name to the backup's create-index route", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { name: "idx-restored" } }]);
  await action.execute!({ backupId: "bk_1", name: "idx-restored" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/backups/bk_1/create-index");
  assertEquals(JSON.parse(calls[0].body!), { name: "idx-restored" });
});

Deno.test("index-restore: a backup id and a new name are both required", async () => {
  const noId = mockCtx();
  await assertRejects(
    async () => await action.execute!({ name: "x" }, noId.ctx),
    Error,
    "backupId",
  );
  const noName = mockCtx();
  await assertRejects(
    async () => await action.execute!({ backupId: "bk_1" }, noName.ctx),
    Error,
    "name",
  );
  assertEquals(noId.calls.length + noName.calls.length, 0);
});

Deno.test("index-restore: the description says recovery is additive", () => {
  assert(/never an overwrite/i.test(action.description!), action.description);
});
