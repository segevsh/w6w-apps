import { assertEquals, assertRejects } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POST /webhooks, 201 body returned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "h1", events: ["workflow_completed"], targetURL: "https://x.test/h" },
  }]);
  const out = await webhookCreate.execute(
    { events: ["workflow_completed"], targetURL: " https://x.test/h ", status: "enabled" },
    ctx,
  ) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    events: ["workflow_completed"],
    targetURL: "https://x.test/h",
    status: "enabled",
  });
  assertEquals(out.id, "h1");
});

Deno.test("webhook-create: a plain-HTTP target is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await webhookCreate.execute(
      { events: ["workflow_completed"], targetURL: "http://x.test/h" },
      ctx,
    )
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-create: no events is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await webhookCreate.execute({ events: [], targetURL: "https://x.test/h" }, ctx)
  );
  assertEquals(calls.length, 0);
});
