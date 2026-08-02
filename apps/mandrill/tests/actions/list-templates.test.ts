import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-templates.ts";

Deno.test("list-templates: POSTs /templates/list.json with an optional label filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ label: "onboarding" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/templates/list.json");
  assertEquals(JSON.parse(calls[0].body!), { label: "onboarding" });
});
