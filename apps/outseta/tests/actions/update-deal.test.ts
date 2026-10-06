import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/update-deal.ts";

Deno.test("update-deal: identity", () => {
  assertEquals(action.key, "update-deal");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "deal");
  assertEquals(action.idempotent, true);
});

Deno.test("update-deal: sends PUT /api/v1/crm/deals/d1", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Uid: "x1" } }]);
  const result = await action.execute({
    dealUid: "d1",
    amount: 2000,
  } as never, connected(ctx));
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "acme.outseta.com");
  assertEquals(calls[0].method, "PUT");
  assertEquals(url.pathname, "/api/v1/crm/deals/d1");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    Amount: 2000,
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals((result as { Uid: string }).Uid, "x1");
  // The credential is the auth hook's job — no action writes it.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("update-deal: a failure names the status and the request", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const err = await assertRejects(async () => {
    await action.execute({
      dealUid: "d1",
      amount: 2000,
    } as never, connected(ctx));
  });
  assert((err as Error).message.includes("404"));
  assert((err as Error).message.includes("/api/v1/crm/deals/d1"));
});
