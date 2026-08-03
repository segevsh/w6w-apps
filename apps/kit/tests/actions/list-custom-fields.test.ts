import { assertEquals } from "@std/assert";
import action from "../../actions/list-custom-fields.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-custom-fields: GETs /v4/custom_fields with no params by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { custom_fields: [], pagination: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/custom_fields");
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-custom-fields: forwards cursor pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { custom_fields: [] } }]);
  await action.execute!({ after: "c1", perPage: 20, includeTotalCount: true }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("after"), "c1");
  assertEquals(p.get("per_page"), "20");
  assertEquals(p.get("include_total_count"), "true");
});

Deno.test("list-custom-fields: returns rows under Kit's custom_fields key", async () => {
  const body = { custom_fields: [{ id: 1, label: "Last name", key: "last_name" }], pagination: {} };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
});
