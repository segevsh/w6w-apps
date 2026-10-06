import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import subscribe from "../../actions/subscribe-webhook.ts";

Deno.test("subscribe-webhook: POSTs {target_url, event} and returns the one-time secret", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "w1", secret: "s3cret" } }]);
  const out = await subscribe.execute({
    event: "booking_new_any_status",
    targetUrl: "https://hooks.example/lodgify",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/webhooks/v1/subscribe");
  assertEquals(JSON.parse(calls[0].body!), {
    target_url: "https://hooks.example/lodgify",
    event: "booking_new_any_status",
  });
  assertEquals(out, { id: "w1", secret: "s3cret" });
});

Deno.test("subscribe-webhook: refuses an event Lodgify does not document", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(subscribe.execute({ event: "nope", targetUrl: "https://x" }, ctx)),
    Error,
    "event",
  );
  assertEquals(calls.length, 0);
});
