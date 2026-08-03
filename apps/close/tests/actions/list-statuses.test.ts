import { assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/list-statuses.ts";

Deno.test("list-statuses: GETs /status/lead/ by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({ objectType: "lead" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/status/lead/");
});

Deno.test("list-statuses: GETs /status/opportunity/ for pipeline stages", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({ objectType: "opportunity" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/status/opportunity/");
});

Deno.test("list-statuses: falls back to the lead path for any unexpected value", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  // The select cannot produce this, but execute must not splice it into the URL.
  await action.execute({ objectType: "../../evil" as "lead" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/status/lead/");
});

Deno.test("list-statuses: passes _fields through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({ objectType: "opportunity", fields: "id,label" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("_fields"), "id,label");
});

Deno.test("list-statuses: offers exactly the two documented object types", () => {
  const p = param(action, "objectType");
  assertEquals(p.required, true);
  assertEquals(optionValues(action, "objectType"), ["lead", "opportunity"]);
});
