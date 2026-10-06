import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import fileUploadUrl from "../../actions/file-upload-url.ts";

Deno.test("file-upload-url: posts the url", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "uid": "f1" } } }]);
  const out = await fileUploadUrl.execute!(
    { "downloadUrl": "https://x.test/a.pdf", "filename": "a.pdf" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/files");
  assertEquals(JSON.parse(calls[0].body!), {
    "download_url": "https://x.test/a.pdf",
    "filename": "a.pdf",
  });
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("file-upload-url: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await fileUploadUrl.execute!(
      { "downloadUrl": "https://x.test/a.pdf", "filename": "a.pdf" } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});
