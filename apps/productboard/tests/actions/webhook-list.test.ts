import { assert, assertEquals } from "@std/assert";
import action from "../../actions/webhook-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: GETs /v2/webhooks", async () => {
  const { ctx, calls } = mockCtx([{
    body: listEnvelope([{ id: "w-1", fields: { name: "Feature changes" } }]),
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/webhooks");
  assertEquals(out.items.length, 1);
});

Deno.test("webhook-list: the cursor is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ pageCursor: "cur" }, ctx);
  assertEquals(queryOf(calls[0].url), { pageCursor: "cur" });
});

Deno.test("webhook-list: records that the configured secret is never returned", () => {
  assert(action.description!.includes("never"), action.description!);
});
