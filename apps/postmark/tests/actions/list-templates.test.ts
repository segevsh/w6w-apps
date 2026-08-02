import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-templates.ts";

Deno.test("list-templates: GETs /templates with count/offset defaults", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { TotalCount: 0, Templates: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/templates");
  assertEquals(url.searchParams.get("count"), "100");
  assertEquals(url.searchParams.get("offset"), "0");
});

Deno.test("list-templates: forwards templateType and layoutTemplate filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ templateType: "Layout", layoutTemplate: "main-layout" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("templatetype"), "Layout");
  assertEquals(url.searchParams.get("layouttemplate"), "main-layout");
});
