import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import upload from "../../actions/send-file-upload.ts";

Deno.test("Send File Upload sends binary multipart bytes and lets fetch set the boundary", async () => {
  const { ctx } = mockCtx();
  let captured: RequestInit | undefined;
  ctx.fetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
    captured = init;
    return Promise.resolve(new Response('{"id":"upload"}'));
  }) as typeof fetch;
  await upload.execute({
    fileUploadId: "upload",
    filename: "test.bin",
    fileBase64: "AAEC/w==",
    partNumber: 2,
  }, ctx);
  const form = captured?.body as FormData;
  assertEquals(form.get("part_number"), "2");
  const file = form.get("file") as File;
  assertEquals(file.name, "test.bin");
  assertEquals([...new Uint8Array(await file.arrayBuffer())], [0, 1, 2, 255]);
  assertEquals(new Headers(captured?.headers).has("content-type"), false);
});
