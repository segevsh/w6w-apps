import { assertEquals } from "@std/assert";
import action from "../../actions/update-webhook.ts";
import { bodyOf, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-webhook: PUTs only the changed fields, keeping explicit enabled:false", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "w1", signing_secret: "abc" } } }]);
  const out = await exec(
    action,
    { webhookId: "w1", enabled: false, events: ["activity.sent"] },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/w1");
  assertEquals(bodyOf(calls[0]), { enabled: false, events: ["activity.sent"] });
  assertEquals(out, { data: { id: "w1" } });
});

Deno.test("update-webhook: maps name, url and version", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await exec(action, { webhookId: "w1", name: "n", url: "https://x.test", version: 1 }, ctx);
  assertEquals(bodyOf(calls[0]), { name: "n", url: "https://x.test", version: 1 });
});
