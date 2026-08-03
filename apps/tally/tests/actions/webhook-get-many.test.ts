import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-get-many.ts";

Deno.test("webhook-get-many: GETs /webhooks and reads the `webhooks` key", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        webhooks: [{ id: "wh1", url: "https://x.test" }],
        page: 1,
        limit: 25,
        hasMore: false,
      },
    },
  ]);
  const result = await action.execute({ page: 1, limit: 25 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/webhooks");
  assertEquals(url.searchParams.get("limit"), "25");
  // NOT the `items` envelope.
  assertEquals(result.webhooks, [{ id: "wh1", url: "https://x.test" }]);
  assertEquals(result.hasMore, false);
});

Deno.test("webhook-get-many: caps limit at Tally's documented 100 for this endpoint", () => {
  const limit = action.params?.find((p) => p.key === "limit");
  assertEquals(limit?.validation?.max, 100);
});

Deno.test("webhook-get-many: tolerates an empty body", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals((await action.execute({}, ctx)).webhooks, []);
});
