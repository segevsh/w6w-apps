import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-list: returns the webhooks array", async () => {
  const { ctx, calls } = mockCtx([{ body: { webhooks: [{ id: "w" }] } }]);
  const out = await webhookList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/webhook");
  assertEquals(out, { webhooks: [{ id: "w" }] });
});

Deno.test("webhook-list: a missing array becomes empty", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await webhookList.execute({}, ctx), { webhooks: [] });
});
