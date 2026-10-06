import { assertEquals } from "@std/assert";
import action from "../../actions/get-webhook.ts";
import { exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-webhook: GETs /v1/webhooks/{id} and drops any signing secret", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: "w1", url: "https://x.test/h", signing_secret: "abc" } },
  }]);
  const out = await exec(action, { webhookId: "w/1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/w%2F1");
  assertEquals(out, { data: { id: "w1", url: "https://x.test/h" } });
});

Deno.test("get-webhook: is a read action with a required id", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params![0].required, true);
});
