import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-file.ts";

Deno.test("get-file: GETs /files/{id}", async () => {
  const file = { id: "123", type: "file", name: "invoice.pdf" };
  const { ctx, calls } = mockCtx([{ body: file }]);
  const result = await action.execute!({ fileId: "123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/files/123");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, file);
});

Deno.test("get-file: forwards the fields query param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ fileId: "123", fields: "name,size" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields"), "name,size");
});
