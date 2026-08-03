import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx, paramsOf } from "../_helpers.ts";
import action from "../../actions/form-get-many.ts";

Deno.test("form-get-many: GETs /forms with no parameters by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { "1": { title: "Contact" } } }], { display: DISPLAY });
  const out = await action.execute!({}, ctx) as { forms: Record<string, unknown> };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms`);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.forms, { "1": { title: "Contact" } });
});

Deno.test("form-get-many: sends form IDs as the INDEXED include array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ formIds: [3, 7] }, ctx);
  const params = paramsOf(calls);
  assertEquals(params.get("include[0]"), "3");
  assertEquals(params.get("include[1]"), "7");
});

Deno.test("form-get-many: an empty ID list is omitted entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ formIds: [] }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("form-get-many: an empty body still yields an object under `forms`", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }], { display: DISPLAY });
  const out = await action.execute!({}, ctx) as { forms: unknown };
  assertEquals(out.forms, {});
});

Deno.test("form-get-many: is a search action against the form resource", () => {
  assertEquals(action.key, "form-get-many");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "form");
  assert(action.output);
});
