import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/subscribe-to-email-list.ts";

Deno.test("subscribe-to-email-list: identity", () => {
  assertEquals(action.key, "subscribe-to-email-list");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "email-list");
  assertEquals(action.idempotent, false);
});

Deno.test("subscribe-to-email-list: sends POST /api/v1/email/lists/l1/subscriptions", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Uid: "x1" } }]);
  const result = await action.execute({
    emailListUid: "l1",
    email: "a@example.com",
    sendWelcomeEmail: true,
  } as never, connected(ctx));
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "acme.outseta.com");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/api/v1/email/lists/l1/subscriptions");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    Person: {
      Email: "a@example.com",
    },
    SendWelcomeEmail: true,
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals((result as { Uid: string }).Uid, "x1");
  // The credential is the auth hook's job — no action writes it.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("subscribe-to-email-list: a failure names the status and the request", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const err = await assertRejects(async () => {
    await action.execute({
      emailListUid: "l1",
      email: "a@example.com",
      sendWelcomeEmail: true,
    } as never, connected(ctx));
  });
  assert((err as Error).message.includes("404"));
  assert((err as Error).message.includes("/api/v1/email/lists/l1/subscriptions"));
});

Deno.test("subscribe-to-email-list: refuses a call with neither personUid nor email", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => {
    await action.execute({ emailListUid: "l1" } as never, connected(ctx));
  });
  assertEquals(calls.length, 0);
});
