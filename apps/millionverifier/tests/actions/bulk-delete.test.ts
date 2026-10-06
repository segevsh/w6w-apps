import { assert, assertEquals, assertRejects } from "@std/assert";
import bulkDelete from "../../actions/bulk-delete.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("bulk-delete: GETs /bulkapi/v2/delete on the bulk host with file_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "ok" } }]);
  const out = await run(bulkDelete, { fileId: "942" }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.hostname + u.pathname, "bulkapi.millionverifier.com/bulkapi/v2/delete");
  assertEquals(u.searchParams.get("file_id"), "942");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.result, "ok");
  assertEquals(bulkDelete.idempotent, true);
});

Deno.test("bulk-delete: file_not_found on a HTTP 200 throws; fileId is required", async () => {
  const { ctx } = mockCtx([{ body: { error: "file_not_found" } }]);
  const err = await assertRejects(() => run(bulkDelete, { fileId: "1" }, ctx));
  assert((err as Error).message.includes("file_not_found"));
  await assertRejects(() => run(bulkDelete, {}, mockCtx().ctx), Error, "fileId is required");
});
