import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhooksGet from "../../actions/webhooks-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhooks-get: GETs /webhooks/{id} and strips the signing secret", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "1", signature: { algo: "HS256", secret: "s" } },
  }]);
  const out = await webhooksGet.execute({ webhookId: "1" }, ctx) as {
    signature: { secret?: string };
  };
  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks/1");
  assertEquals(out.signature.secret, undefined);
});
