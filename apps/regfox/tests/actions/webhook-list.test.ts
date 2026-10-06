import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-list.ts";
import { envelope, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-list: removes signingSecret and token from every webhook", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([
      { id: 1, signingSecret: "s3cret", url: "https://x.test" },
      { id: 2, token: "legacy", url: "https://y.test" },
    ]),
  }]);
  const out = await exec(action, {}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/webhooks");
  assertEquals(out.webhooks, [
    { id: 1, url: "https://x.test" },
    { id: 2, url: "https://y.test" },
  ]);
  assertEquals(JSON.stringify(out).includes("s3cret"), false);
  assertEquals(JSON.stringify(out).includes("legacy"), false);
  assertEquals(out.totalResults, 2);
});
