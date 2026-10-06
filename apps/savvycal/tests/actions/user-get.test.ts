import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: GET /v1/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "user_1", plan: "premium" } }]);
  const out = await userGet.execute({}, ctx) as { plan: string };
  assertEquals(pathOf(calls[0].url), "/v1/me");
  assertEquals(out.plan, "premium");
});

Deno.test("user-get: a 401 plain-text body becomes a readable error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "Unauthenticated",
    headers: { "content-type": "text/plain" },
  }]);
  let message = "";
  try {
    await userGet.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "SavvyCal 401 for GET /v1/me: Unauthenticated");
});
