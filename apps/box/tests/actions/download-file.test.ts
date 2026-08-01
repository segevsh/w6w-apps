import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/download-file.ts";

Deno.test("download-file: GETs /files/{id}/content and returns text by default", async () => {
  const { ctx, calls } = mockCtx([
    { body: "file contents", headers: { "content-type": "application/octet-stream" } },
  ]);

  const result = await action.execute!({ fileId: "123" }, ctx) as {
    content: string;
    encoding: string;
  };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/files/123/content");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.content, "file contents");
  assertEquals(result.encoding, "utf-8");
});

Deno.test("download-file: base64-encodes body when asText=false", async () => {
  const { ctx } = mockCtx([
    { body: "AB", headers: { "content-type": "application/octet-stream" } },
  ]);
  const result = await action.execute!({ fileId: "123", asText: false }, ctx) as {
    content: string;
    encoding: string;
  };
  // btoa("AB") -> "QUI="
  assertEquals(result.encoding, "base64");
  assertEquals(result.content, "QUI=");
});
