import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import action from "../../actions/whoami.ts";
import { mockCtx, pathOf, unauthorized } from "../_helpers.ts";

Deno.test("whoami: calls GET /v3/debug/whoami", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "123", login: "acme" } }]);
  const out = await action.execute({}, ctx) as { client: { id: string } };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/debug/whoami");
  assertEquals(calls[0].body, null);
  assertEquals(out.client.id, "123");
});

Deno.test("whoami: surfaces an unauthorized error from the body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: unauthorized }]);
  const err = await assertRejects(async () => await action.execute({}, ctx));
  assertMatch((err as Error).message, /CleverReach 401: Unauthorized \(code 401\)/);
});
