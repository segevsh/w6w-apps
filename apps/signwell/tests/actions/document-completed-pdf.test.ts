import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-completed-pdf.ts";

Deno.test("document-completed-pdf: always asks for url_only and returns the file_url", async () => {
  const { ctx, calls } = mockCtx([{
    body: { file_url: "https://www.signwell.com/completed_docs/x/" },
  }]);
  const out = await action.execute!({ id: "d1" }, ctx);
  assertEquals(out, { file_url: "https://www.signwell.com/completed_docs/x/" });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/documents/d1/completed_pdf");
  assertEquals(url.searchParams.get("url_only"), "true");
  assertEquals(url.searchParams.has("audit_page"), false);
  assertEquals(url.searchParams.has("file_format"), false);
});

Deno.test("document-completed-pdf: forwards audit_page=false and file_format", async () => {
  const { ctx, calls } = mockCtx([{ body: { file_url: "u" } }]);
  await action.execute!({ id: "d1", audit_page: false, file_format: "zip" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("audit_page"), "false");
  assertEquals(url.searchParams.get("file_format"), "zip");
  assertEquals(url.searchParams.get("url_only"), "true");
});

Deno.test("document-completed-pdf: id is required", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
});
