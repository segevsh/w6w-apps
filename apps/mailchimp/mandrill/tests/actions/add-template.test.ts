import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-template.ts";

Deno.test("add-template: POSTs /templates/add.json with name and defaults publish=true", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { slug: "welcome" } }]);
  await action.execute!({ name: "welcome", code: "<p>Hi</p>" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/templates/add.json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "welcome");
  assertEquals(body.code, "<p>Hi</p>");
  assertEquals(body.publish, true);
});

Deno.test("add-template: normalizes comma-separated labels to an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ name: "welcome", labels: "onboarding, drip" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).labels, ["onboarding", "drip"]);
});
