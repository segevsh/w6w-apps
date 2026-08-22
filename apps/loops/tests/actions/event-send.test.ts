import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-send.ts";

Deno.test("event-send: POSTs the event name and the contact identity", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }]);
  await action.execute!({ eventName: "trial_ended", email: "ada@example.com" }, ctx);
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/events/send");
  assertEquals(JSON.parse(calls[0].body!), {
    eventName: "trial_ended",
    email: "ada@example.com",
  });
});

/** Loops takes {listId: boolean}; an array would be ignored silently. */
Deno.test("event-send: a comma list of mailing lists becomes an add-to-all object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    eventName: "signed_up",
    email: "a@x.com",
    mailingLists: "l1, l2",
    eventProperties: '{"plan":"pro"}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.mailingLists, { l1: true, l2: true });
  assertEquals(body.eventProperties, { plan: "pro" });
});

Deno.test("event-send: naming neither identity is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ eventName: "x" }, ctx),
    Error,
    "`event-send` needs a contact",
  );
  assertEquals(calls.length, 0);
});

Deno.test("event-send: an event name is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ email: "a@x.com" }, ctx),
    Error,
    "`eventName`",
  );
  assertEquals(calls.length, 0);
});

/** An event can send real email, so a retry needs the same protection as a send. */
Deno.test("event-send: offers the same idempotency key as the direct send", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv2" };
  await action.execute!({
    eventName: "x",
    email: "a@x.com",
    useInvocationIdempotencyKey: true,
  }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "w6w-inv2");
  assertEquals(action.idempotent, false);
  assert(action.description!.includes("trigger"), action.description);
});
