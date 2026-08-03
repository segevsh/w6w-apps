import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-fields.ts";

Deno.test("list-fields: GETs /api/fields with page/limit defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], links: {}, meta: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/fields");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("list-fields: forwards the keyword and type filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ keyword: "phone", type: "text", sort: "-name" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("filter[keyword]"), "phone");
  assertEquals(params.get("filter[type]"), "text");
  assertEquals(params.get("sort"), "-name");
});

Deno.test("list-fields: omits the filters when not provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("filter[keyword]"));
  assert(!params.has("filter[type]"));
});

Deno.test("list-fields: the type options are MailerLite's three field types", () => {
  const options = action.params!.find((p) => p.key === "type")!.options as Array<
    { value: string }
  >;
  assertEquals(options.map((o) => o.value), ["text", "number", "date"]);
});
