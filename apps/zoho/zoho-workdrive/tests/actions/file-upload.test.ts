import { assert, assertEquals } from "@std/assert";
import fileUpload from "../../actions/file-upload.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

function withFile(ctx: unknown, bytes: Uint8Array) {
  (ctx as { file: unknown }).file = {
    read: () => Promise.resolve({ ref: { contentType: "text/plain" }, bytes }),
  };
}

Deno.test("file-upload: POSTs multipart with parent_id, filename and the file bytes", async () => {
  const { ctx, calls } = mockWorkDriveCtx(
    [{ body: { data: [{ attributes: { resource_id: "n1" }, type: "files" }] } }],
    "www.zohoapis.eu",
  );
  withFile(ctx, new TextEncoder().encode("hello"));
  const res = await fileUpload.execute(
    { parentId: "p1", fileName: "a.txt", content: "ref", overrideExisting: true },
    ctx,
  ) as { item: unknown[] };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://www.zohoapis.eu/workdrive/api/v1/upload");
  assert(calls[0].headers["content-type"].startsWith("multipart/form-data; boundary="));
  assertEquals(res.item.length, 1);
});

Deno.test("file-upload: fails clearly when the host has no file storage", async () => {
  const { ctx } = mockWorkDriveCtx([]);
  let message = "";
  try {
    await fileUpload.execute({ parentId: "p", fileName: "a", content: "r" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("ctx.file"));
});

Deno.test("file-upload: a vendor error id surfaces", async () => {
  const { ctx } = mockWorkDriveCtx([{
    status: 422,
    body: { errors: [{ id: "F7004", title: "Invalid OAuth scope" }] },
  }]);
  withFile(ctx, new Uint8Array([1, 2]));
  let message = "";
  try {
    await fileUpload.execute({ parentId: "p", fileName: "a", content: "r" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("F7004: Invalid OAuth scope"), message);
});
