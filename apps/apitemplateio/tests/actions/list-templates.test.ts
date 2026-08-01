import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-templates.ts";

Deno.test("list-templates: GETs /v2/list-templates and returns the response verbatim", async () => {
  const body = { status: "success", templates: [{ template_id: "tpl-1", name: "Invoice" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://rest.apitemplate.io");
  assertEquals(url.pathname, "/v2/list-templates");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("list-templates: forwards format, group name, limit, and offset", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", templates: [] } }]);
  await action.execute!(
    { format: "PDF", groupName: "invoices", limit: 10, offset: 20 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("format"), "PDF");
  assertEquals(url.searchParams.get("group_name"), "invoices");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("offset"), "20");
});

Deno.test("list-templates: omits format when empty string (Any)", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", templates: [] } }]);
  await action.execute!({ format: "" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("format"), false);
});
