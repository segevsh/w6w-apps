import { assert, assertEquals, assertRejects } from "@std/assert";
import bulkGetFile from "../../actions/bulk-get-file.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("bulk-get-file: GETs fileinfo and maps the counts, a file-level error is data", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      file_id: 940,
      file_name: "a.txt",
      status: "error",
      percent: 60,
      ok: 3,
      catch_all: 1,
      estimated_time_sec: 120,
      error: "bad file",
      createdate: "2021-05-16 12:25:42",
    },
  }]);
  const out = await run(bulkGetFile, { fileId: "940" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://bulkapi.millionverifier.com/bulkapi/v2/fileinfo",
  );
  assertEquals(url.searchParams.get("file_id"), "940");
  assertEquals(out.fileId, "940");
  assertEquals(out.catchAll, 1);
  assertEquals(out.estimatedTimeSec, 120);
  assertEquals(out.createdAt, "2021-05-16 12:25:42");
  assertEquals(out.error, "bad file");
});

Deno.test("bulk-get-file: invalid_api_key and a missing id", async () => {
  const { ctx } = mockCtx([{ body: { error: "invalid_api_key" } }]);
  const err = await assertRejects(() => run(bulkGetFile, { fileId: "1" }, ctx));
  assert((err as Error).message.includes("invalid_api_key"));
  await assertRejects(() => run(bulkGetFile, {}, mockCtx().ctx), Error, "fileId is required");
});
