import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import webhookGet from "../../actions/webhook-get.ts";

Deno.test("webhook-get: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1", secret: "s3cret" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await webhookGet.execute({ "uid": "uid-1" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/webhooks/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { uid: "r1" });
});

Deno.test("webhook-get: declares its params and kind", () => {
  assertEquals((webhookGet.params ?? []).map((p) => p.key), ["uid"]);
  assertEquals((webhookGet.params ?? []).filter((p) => p.required).map((p) => p.key), ["uid"]);
  assertEquals(webhookGet.type, "read");
});
