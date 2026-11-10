import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/lead-webhook.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const JSON_BODY = `{ "leadId" : 1001,  "email":"ada@example.com",
  "firstName": "Ada",   "campaign" : "Welcome series" }`;

const call = (rawBody: string | null, method = "POST") => ({
  raw: {
    method,
    path: "/",
    query: {},
    headers: {} as Record<string, string>,
    body: null,
    ...(rawBody === null ? {} : { rawBody }),
  },
  params: {},
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const run = (input: ReturnType<typeof call>) =>
  trigger.handleIngest!(input as never, mockCtx().ctx);

async function refused(fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error && err.message.includes(includes), `message: ${String(err)}`);
    return;
  }
  throw new Error("expected the delivery to be refused");
}

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(JSON_BODY)) !== JSON_BODY);
});

test("app declares the webhook trigger with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), ["lead-webhook"]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(trigger.poll, undefined);
  assertEquals(typeof trigger.onSubscribe, "function");
});

test("manual webhook: onSubscribe makes no vendor call and returns the callback URL", async () => {
  const m = mockCtx([]);
  const state = await trigger.onSubscribe!(
    { params: {}, callbackUrl: CALLBACK, subscriptionId: "s" } as never,
    m.ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  assertEquals(m.calls.length, 0);
});

test("a JSON payload is parsed from the raw body, lifting leadId, email and campaign", async () => {
  const out = evs(await run(call(JSON_BODY))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].leadId, "1001");
  assertEquals(out[0].email, "ada@example.com");
  assertEquals(out[0].campaign, "Welcome series");
  assertEquals(out[0].data, {
    leadId: 1001,
    email: "ada@example.com",
    firstName: "Ada",
    campaign: "Welcome series",
  });
});

test("a form-encoded payload (Request Token Encoding: Form/Url) is parsed too", async () => {
  const out = evs(await run(call("leadId=1002&email=bob%40example.com&firstName=Bob"))) as Array<
    Record<string, unknown>
  >;
  assertEquals(out[0].email, "bob@example.com");
  assertEquals(out[0].leadId, "1002");
  assertEquals(out[0].campaign, null);
  assertEquals(out[0].data, { leadId: "1002", email: "bob@example.com", firstName: "Bob" });
});

test("PUT and PATCH payloads are accepted; GET, absent rawBody and empty or non-object bodies are refused", async () => {
  assertEquals((evs(await run(call(JSON_BODY, "PUT"))) as unknown[]).length, 1);
  assertEquals((evs(await run(call(JSON_BODY, "patch"))) as unknown[]).length, 1);
  await refused(() => run(call(JSON_BODY, "GET")), "POST");
  await refused(() => run(call(null)), "raw body");
  await refused(() => run(call("")), "Not a Marketo");
  await refused(() => run(call("[1,2]")), "Not a Marketo");
});
