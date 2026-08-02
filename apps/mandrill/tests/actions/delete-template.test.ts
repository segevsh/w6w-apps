import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-template.ts";

Deno.test("delete-template: POSTs /templates/delete.json with the template name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { slug: "welcome" } }]);
  await action.execute!({ name: "welcome" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/templates/delete.json");
  assertEquals(JSON.parse(calls[0].body!), { name: "welcome" });
});
