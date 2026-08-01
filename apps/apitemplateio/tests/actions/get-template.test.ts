import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-template.ts";

Deno.test("get-template: GETs /v2/get-template with template_id and returns the response verbatim", async () => {
  const body = { status: "success", template_id: "tpl-1", body: "<html></html>", css: "" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ templateId: "tpl-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/get-template");
  assertEquals(url.searchParams.get("template_id"), "tpl-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
