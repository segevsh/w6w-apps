import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/template-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-get: GET /templates/{name}", async () => {
  const { ctx, calls } = mockCtx([{ body: { Name: "My Tpl", Subject: "s", Body: [] } }]);
  const out = await action.execute({ name: "My Tpl" }, ctx) as { Name: string };
  assertEquals(out.Name, "My Tpl");
  assertEquals(pathOf(calls[0].url), "/v4/templates/My%20Tpl");
});

Deno.test("template-get: name required", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "required");
});
