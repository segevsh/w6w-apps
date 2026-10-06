import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: strips each webhook's signing secret", async () => {
  const { ctx, calls } = mockCtx([{
    body: page([{ id: "wh_1", url: "https://x", secret: "whsec_abc" }], "c"),
  }]);
  const out = await webhookList.execute({ limit: 2 }, ctx) as {
    entries: Array<Record<string, unknown>>;
    metadata: { after: string };
  };
  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(queryOf(calls[0].url), { limit: "2" });
  assertEquals(out.entries[0], { id: "wh_1", url: "https://x" });
  assertEquals(JSON.stringify(out).includes("whsec_abc"), false);
  assertEquals(out.metadata.after, "c");
});
