import { assertEquals } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-update: PUTs the full body to the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1" } }]);
  await webhookUpdate.execute({
    id: "w1",
    name: "Hook",
    url: "https://example.com/h",
    eventTypes: ["OPT_OUT"],
    senders: ["61412345678"],
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/webhook/w1");
  assertEquals(bodyOf(calls[0]), {
    name: "Hook",
    url: "https://example.com/h",
    filter: { event_type: ["OPT_OUT"], sender: ["61412345678"] },
  });
});

Deno.test("webhook-update: is idempotent and takes the id first", () => {
  assertEquals(webhookUpdate.idempotent, true);
  assertEquals(webhookUpdate.params![0].key, "id");
});
