import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  base64ToBytes,
  buildMultipart,
  isVendorError,
  MillionVerifierClient,
  splitList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: isVendorError reads the body, ignores a file record's own error", () => {
  assertEquals(isVendorError({ error: "x" }), true);
  assertEquals(isVendorError({ error: "" }), false);
  assertEquals(isVendorError({ file_id: "1", error: "file broke" }), false);
  assertEquals(isVendorError([{ error: "x" }]), false);
  assertEquals(isVendorError("text"), false);
});

Deno.test("client: HTTP 200 + error throws; non-2xx without JSON error throws with the status", async () => {
  const a = mockCtx([{ body: { error: "invalid_api_key" } }]);
  const err = await assertRejects(() =>
    new MillionVerifierClient(a.ctx).request("/bulkapi/stop", { api: "bulk" })
  );
  assertEquals((err as { vendorCode?: string }).vendorCode, "invalid_api_key");
  const b = mockCtx([{ status: 503, body: "down" }]);
  await assertRejects(
    () => new MillionVerifierClient(b.ctx).request("/api/v3/credits", { api: "single" }),
    Error,
    "503",
  );
});

Deno.test("client: base64, list splitting and multipart helpers", () => {
  assertEquals([...base64ToBytes("data:text/plain;base64," + btoa("hi"))], [104, 105]);
  assertEquals(splitList("a@b.com; c@d.com\n e@f.com,"), ["a@b.com", "c@d.com", "e@f.com"]);
  const { body, contentType } = buildMultipart([{
    field: 'f"x',
    filename: "a\r\nb.txt",
    contentType: "text/plain",
    bytes: new Uint8Array([65]),
  }]);
  const text = new TextDecoder().decode(body);
  assert(contentType.startsWith("multipart/form-data; boundary="));
  assert(text.includes('name="f_x"; filename="a__b.txt"'));
});
