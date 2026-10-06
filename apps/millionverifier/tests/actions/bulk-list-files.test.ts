import { assertEquals, assertRejects } from "@std/assert";
import bulkListFiles from "../../actions/bulk-list-files.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("bulk-list-files: sends the filters under the vendor's names and pages by offset", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      files: [{ file_id: "1", status: "finished" }, { file_id: "2", status: "paused" }],
      total: 5,
    },
  }]);
  const out = await run(bulkListFiles, {
    offset: 0,
    limit: 2,
    status: "finished,paused",
    createdFrom: "2023-01-01 15:00:05",
    updatedAtTo: "2024-01-01 00:00:00",
    percentFrom: 10,
    hasError: false,
    name: "list",
  }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/bulkapi/v2/filelist");
  assertEquals(u.hostname, "bulkapi.millionverifier.com");
  assertEquals(u.searchParams.get("limit"), "2");
  assertEquals(u.searchParams.get("status"), "finished,paused");
  assertEquals(u.searchParams.get("createdate_from"), "2023-01-01 15:00:05");
  assertEquals(u.searchParams.get("updated_at_to"), "2024-01-01 00:00:00");
  assertEquals(u.searchParams.get("percent_from"), "10");
  assertEquals(u.searchParams.get("has_error"), "false");
  assertEquals(u.searchParams.get("name"), "list");
  assertEquals(out.total, 5);
  assertEquals(out.nextOffset, 2);
  assertEquals((out.files as Array<{ fileId: string }>).map((f) => f.fileId), ["1", "2"]);
});

Deno.test("bulk-list-files: the last page has no nextOffset; defaults are offset 0 limit 50", async () => {
  const { ctx, calls } = mockCtx([{ body: { files: [{ file_id: "9" }], total: 3 } }]);
  const out = await run(bulkListFiles, { offset: 2 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "50");
  assertEquals(out.nextOffset, null);
});

Deno.test("bulk-list-files: limit above 50 is refused locally; an error body throws", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: "empty_api_key" } }]);
  await assertRejects(() => run(bulkListFiles, { limit: 51 }, ctx), Error, "limit");
  assertEquals(calls.length, 0);
  await assertRejects(() => run(bulkListFiles, {}, ctx), Error, "empty_api_key");
});
