import { assert, assertEquals, assertRejects } from "@std/assert";
import bulkStop from "../../actions/bulk-stop.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("bulk-stop: GETs /bulkapi/stop on the bulk host with file_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "ok" } }]);
  const out = await run(bulkStop, { fileId: "942" }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.hostname + u.pathname, "bulkapi.millionverifier.com/bulkapi/stop");
  assertEquals(u.searchParams.get("file_id"), "942");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.result, "ok");
  assertEquals(bulkStop.idempotent, true);
});

Deno.test("bulk-stop: file_not_found on a HTTP 200 throws; fileId is required", async () => {
  const { ctx } = mockCtx([{ body: { error: "file_not_found" } }]);
  const err = await assertRejects(() => run(bulkStop, { fileId: "1" }, ctx));
  assert((err as Error).message.includes("file_not_found"));
  await assertRejects(() => run(bulkStop, {}, mockCtx().ctx), Error, "fileId is required");
});
