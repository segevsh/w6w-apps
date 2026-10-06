import { assertEquals, assertRejects } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/file-upload.ts";

Deno.test("file-upload: POSTs UTF-8 text to fs-content as raw bytes", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ status: 201, body: { group_id: "g", entry_id: "e" } }]);
  const out = await action.execute({ path: "Shared/n.txt", content: "héllo" }, ctx);
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/fs-content/Shared/n.txt");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/octet-stream");
  assertEquals(out, { path: "/Shared/n.txt", group_id: "g", entry_id: "e" });
});

Deno.test("file-upload: base64 content is decoded and Last-Modified forwarded", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: "" }]);
  const out = await action.execute(
    {
      path: "/a.bin",
      content: btoa("abc"),
      encoding: "base64",
      lastModified: "Sun, 26 Aug 2012 03:55:29 GMT",
    },
    ctx,
  );
  assertEquals(calls[0].headers["last-modified"], "Sun, 26 Aug 2012 03:55:29 GMT");
  assertEquals(out, { path: "/a.bin" });
});

Deno.test("file-upload: surfaces upload failures", async () => {
  const { ctx } = mockEgnyteCtx([{ status: 403, body: { errorMessage: "no" } }]);
  await assertRejects(
    async () => await action.execute({ path: "a", content: "x" }, ctx),
    Error,
    "Egnyte 403",
  );
});
