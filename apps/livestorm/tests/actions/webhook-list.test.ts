import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";

test("webhook-list: GETs /webhooks with an event filter", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("webhooks", "w1")]) }]);
  await webhookList.execute({ event: "session.started" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(queryOf(calls[0].url), { "filter[event]": "session.started" });
});
