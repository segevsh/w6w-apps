import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-groups.ts";

Deno.test("list-groups: GETs /api/groups with page/limit defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], links: {}, meta: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/groups");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("list-groups: forwards the name filter and a descending sort", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ name: "news", sort: "-total", limit: 100, page: 3 }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("filter[name]"), "news");
  assertEquals(params.get("sort"), "-total");
  assertEquals(params.get("limit"), "100");
  assertEquals(params.get("page"), "3");
});

Deno.test("list-groups: omits the filter and sort when not provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("filter[name]"));
  assert(!params.has("sort"));
});

Deno.test("list-groups: every declared sort option is a documented MailerLite sort", () => {
  const allowed = ["name", "total", "open_rate", "click_rate", "created_at"];
  const options = action.params!.find((p) => p.key === "sort")!.options as Array<
    { value: string }
  >;
  for (const o of options) {
    assert(allowed.includes(o.value.replace(/^-/, "")), `${o.value} is not documented`);
  }
});
