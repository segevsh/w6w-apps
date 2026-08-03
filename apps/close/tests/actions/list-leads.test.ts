import { assert, assertEquals } from "@std/assert";
import { description, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-leads.ts";

Deno.test("list-leads: is a search action over the lead resource", () => {
  assertEquals(action.key, "list-leads");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "lead");
});

Deno.test("list-leads: GETs /lead/ with the offset paging params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({ limit: 25, skip: 50, fields: "id,name" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/v1/lead/");
  assertEquals(url.searchParams.get("_limit"), "25");
  assertEquals(url.searchParams.get("_skip"), "50");
  assertEquals(url.searchParams.get("_fields"), "id,name");
});

Deno.test("list-leads: sends no query params when none are supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-leads: returns Close's data/has_more envelope unchanged", async () => {
  const body = { data: [{ id: "lead_1" }], has_more: true };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute({}, ctx), body);
});

Deno.test("list-leads: exposes no `query` param, which Close does not document here", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("query"), false);
  assert(/Search action/i.test(description(action)));
});
