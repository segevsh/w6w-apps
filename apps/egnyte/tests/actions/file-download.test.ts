import { assertEquals, assertRejects } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/file-download.ts";

Deno.test("file-download: returns base64, text and checksum header", async () => {
  const { ctx, calls } = mockEgnyteCtx([{
    body: "hello",
    headers: { "content-type": "text/plain", "x-sha512-checksum": "abc" },
  }]);
  const out = await action.execute({ path: "/Shared/h.txt" }, ctx);
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/fs-content/Shared/h.txt");
  assertEquals(out, {
    contentBase64: btoa("hello"),
    text: "hello",
    size: 5,
    contentType: "text/plain",
    checksum: "abc",
  });
});

Deno.test("file-download: an entry id selects a version", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: "ÿ", headers: {} }]);
  await action.execute({ path: "a", entryId: "e9" }, ctx);
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/fs-content/a?entry_id=e9");
});

Deno.test("file-download: a 404 rejects", async () => {
  const { ctx } = mockEgnyteCtx([{ status: 404, body: {} }]);
  await assertRejects(async () => await action.execute({ path: "a" }, ctx), Error, "Egnyte 404");
});
