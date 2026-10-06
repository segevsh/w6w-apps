import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/blacklist-list.ts";
import { mockCtx, pathOf, unauthorized } from "../_helpers.ts";

Deno.test("blacklist-list: calls GET /v3/blacklist", async () => {
  const { ctx, calls } = mockCtx([{ body: ["a@b.co", "c@d.co"] }]);
  const out = await action.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/v3/blacklist");
  assertEquals(out.count, 2);
});

Deno.test("blacklist-list: surfaces an unauthorized error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: unauthorized }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "CleverReach 401");
});
