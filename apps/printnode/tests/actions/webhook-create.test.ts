import { assertEquals, assertRejects } from "@std/assert";
import webhookCreate, { normaliseMessages } from "../../actions/webhook-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POST /webhook, returns new id, strips secrets", async () => {
  const { ctx, calls } = mockCtx([{
    body: [
      { webhookId: 11, secret: "a", url: "u1", messages: ["*"] },
      { webhookId: 188, secret: "password", url: "http://www.myserver.com", messages: ["*"] },
    ],
  }]);
  const out = await webhookCreate.execute({
    url: "http://www.myserver.com",
    secret: "password",
    messages: ["*"],
  }, ctx) as { webhookId: number; items: unknown[] };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/webhook");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "http://www.myserver.com",
    secret: "password",
    messages: ["*"],
  });
  assertEquals(out.webhookId, 188);
  assertEquals(JSON.stringify(out).includes("password"), false);
});

Deno.test("webhook-create: * must stand alone; message types accept a comma string", async () => {
  assertEquals(normaliseMessages("computer state, print job state"), [
    "computer state",
    "print job state",
  ]);
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await webhookCreate.execute(
        { url: "u", secret: "s", messages: ["*", "computer state"] },
        ctx,
      ),
    Error,
    "only selection",
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-create: at least one message type is required", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await webhookCreate.execute({ url: "u", secret: "s", messages: [] }, ctx),
    Error,
    "required",
  );
});
