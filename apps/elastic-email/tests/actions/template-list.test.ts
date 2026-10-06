import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/template-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-list: GET /templates repeats scopeType and templateTypes", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ Name: "welcome" }] }]);
  const out = await action.execute({
    scopeType: "Personal,Global",
    templateTypes: "RawHTML",
    limit: 50,
  }, ctx) as { count: number };
  const u = new URL(calls[0].url);
  assertEquals(pathOf(calls[0].url), "/v4/templates");
  assertEquals(u.searchParams.getAll("scopeType"), ["Personal", "Global"]);
  assertEquals(u.searchParams.getAll("templateTypes"), ["RawHTML"]);
  assertEquals(u.searchParams.get("limit"), "50");
  assertEquals(out.count, 1);
});

Deno.test("template-list: scope is required (the vendor requires it)", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "Scope");
});
