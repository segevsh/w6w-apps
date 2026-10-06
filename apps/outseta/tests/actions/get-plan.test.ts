import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-plan.ts";

Deno.test("get-plan: identity", () => {
  assertEquals(action.key, "get-plan");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "billing");
});

Deno.test("get-plan: sends GET /api/v1/billing/plans/pl1", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Uid: "x1" } }]);
  const result = await action.execute({
    planUid: "pl1",
  } as never, connected(ctx));
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "acme.outseta.com");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/v1/billing/plans/pl1");
  assertEquals(calls[0].body, null);
  assertEquals((result as { Uid: string }).Uid, "x1");
  // The credential is the auth hook's job — no action writes it.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("get-plan: a failure names the status and the request", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const err = await assertRejects(async () => {
    await action.execute({
      planUid: "pl1",
    } as never, connected(ctx));
  });
  assert((err as Error).message.includes("404"));
  assert((err as Error).message.includes("/api/v1/billing/plans/pl1"));
});
