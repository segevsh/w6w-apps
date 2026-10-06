import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-deal.ts";

Deno.test("delete-deal: identity", () => {
  assertEquals(action.key, "delete-deal");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "deal");
  assertEquals(action.idempotent, true);
});

Deno.test("delete-deal: sends DELETE /api/v1/crm/deals/d1", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute({
    dealUid: "d1",
  } as never, connected(ctx));
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "acme.outseta.com");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/api/v1/crm/deals/d1");
  assertEquals(calls[0].body, null);
  assertEquals(result, { deleted: true, uid: "d1" });
  // The credential is the auth hook's job — no action writes it.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("delete-deal: a failure names the status and the request", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const err = await assertRejects(async () => {
    await action.execute({
      dealUid: "d1",
    } as never, connected(ctx));
  });
  assert((err as Error).message.includes("404"));
  assert((err as Error).message.includes("/api/v1/crm/deals/d1"));
});
