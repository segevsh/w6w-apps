import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import webhookDelete from "../../actions/webhook-delete.ts";

Deno.test("webhook-delete: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1", secret: "s3cret" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await webhookDelete.execute({ "uid": "uid-1" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "DELETE");
  assertEquals(url.origin + url.pathname, API + "/webhooks/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { uid: "r1" });
});

Deno.test("webhook-delete: declares its params and kind", () => {
  assertEquals((webhookDelete.params ?? []).map((p) => p.key), ["uid"]);
  assertEquals((webhookDelete.params ?? []).filter((p) => p.required).map((p) => p.key), ["uid"]);
  assertEquals(webhookDelete.type, "perform");
  assertEquals(webhookDelete.idempotent, true);
});
