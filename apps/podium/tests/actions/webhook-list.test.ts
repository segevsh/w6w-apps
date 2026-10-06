import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import webhookList from "../../actions/webhook-list.ts";

Deno.test("webhook-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1", secret: "s3cret" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await webhookList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/webhooks");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }], nextCursor: "c2" });
});

Deno.test("webhook-list: declares its params and kind", () => {
  assertEquals((webhookList.params ?? []).map((p) => p.key), []);
  assertEquals((webhookList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(webhookList.type, "read");
});
