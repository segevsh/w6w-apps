import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/backup-create.ts";

Deno.test("backup-create: posts to the index's backup route", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { backup_id: "bk_1", status: "Pending" } }]);
  await action.execute!({ indexName: "idx", name: "nightly", description: "pre-reingest" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/indexes/idx/backups");
  assertEquals(JSON.parse(calls[0].body!), { name: "nightly", description: "pre-reingest" });
});

/** The copy is not finished when the call returns. */
Deno.test("backup-create: says it is asynchronous, and is not idempotent", () => {
  assert(/[Aa]synchronous/.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});

Deno.test("backup-create: a missing index is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "indexName");
});
