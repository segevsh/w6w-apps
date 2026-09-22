import { assertEquals, assertRejects } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/team-get-many.ts";

Deno.test("team-get-many: GETs /teams with no parameters at all", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [{ id: 514, name: "Web Sales" }] }]);
  const page = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/teams");
  assertEquals(calls[0].method, "GET");
  assertEquals(page.items, [{ id: 514, name: "Web Sales" }]);
});

Deno.test("team-get-many: a USER token without the right is reported verbatim", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 403,
    body: { error: 403, message: "Forbidden action", type: "forbidden_action" },
  }]);
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "forbidden_action");
});
