import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: GETs the subscription by id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "w-1" }) }]);
  const out = await action.execute({ webhookId: "w-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/webhooks/w-1");
  assertEquals(out.data, { id: "w-1" });
});

/** The vendor names this path parameter `webhookId`, not `id`, unlike the rest of v2. */
Deno.test("webhook-get: the param follows the vendor's own `webhookId` spelling", () => {
  assertEquals(action.params?.map((p) => p.key), ["webhookId"]);
  assertEquals(action.params?.[0].required, true);
});
