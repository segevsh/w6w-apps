import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-template.ts";

Deno.test("update-template: POSTs /templates/update.json with the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { slug: "welcome" } }]);
  await action.execute!({ name: "welcome", subject: "New subject" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/templates/update.json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "welcome");
  assertEquals(body.subject, "New subject");
});
