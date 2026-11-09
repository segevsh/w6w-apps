import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-submission.ts";

const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const callbackUrl = "https://hooks.example.test/formstack/sub_1";
const state = { webhookId: "55", formId: "1234567", sharedSecret: SECRET };

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Non-canonical whitespace: JSON.stringify(JSON.parse(raw)) !== raw.
const delivery = (key: string | null = SECRET, name = "HandshakeKey") =>
  `{ "FormID" : "1234567",\n  "UniqueID":"987654321" ,
  "Name" : "Ada Lovelace", "Email":"ada@example.com"${
    key === null ? "" : `, "${name}" : ${JSON.stringify(key)}`
  } }`;
assertEquals(JSON.stringify(JSON.parse(delivery())) !== delivery(), true);

const ingest = async (
  over: { rawBody?: string | undefined; state?: unknown } = {},
) =>
  await trigger.handleIngest!({
    raw: {
      method: "POST",
      path: "",
      query: {},
      headers: {},
      body: null,
      ...("rawBody" in over ? { rawBody: over.rawBody } : { rawBody: delivery() }),
    },
    params: {},
    state: ("state" in over ? over.state : state) as typeof state,
    subscriptionId: "sub",
  }, mockCtx().ctx);

test("formstack: a delivery carrying the stored handshake key becomes one event, without the key", async () => {
  const events = evs(await ingest());
  assertEquals(events, [{
    FormID: "1234567",
    UniqueID: "987654321",
    fields: { Name: "Ada Lovelace", Email: "ada@example.com" },
  }]);
  assertEquals(JSON.stringify(events).includes(SECRET), false);
});

test("formstack: the key is also accepted under its other documented names", async () => {
  for (const name of ["handshake_key", "sharedSecret"]) {
    assertEquals(evs(await ingest({ rawBody: delivery(SECRET, name) })).length, 1);
  }
});

test("formstack: a wrong, truncated, empty or absent handshake key is refused and never echoed", async () => {
  const flipped = (SECRET[0] === "0" ? "1" : "0") + SECRET.slice(1);
  for (const key of [flipped, SECRET.slice(1), SECRET + "0", "", null]) {
    const err = await assertRejects(() => ingest({ rawBody: delivery(key) }));
    assertEquals(err.message.includes(SECRET), false);
    assertEquals(err.message.includes(flipped), false);
  }
});

test("formstack: an absent raw body, a non-JSON body or a non-object body is refused", async () => {
  const err = await assertRejects(() => ingest({ rawBody: undefined }));
  assertEquals(err.message.includes("raw body"), true);
  await assertRejects(() => ingest({ rawBody: "FormID=1&HandshakeKey=abc" }));
  await assertRejects(() => ingest({ rawBody: "[1]" }));
});

test("formstack: an unset or empty stored secret refuses even a delivery with an empty key", async () => {
  for (
    const s of [undefined, {}, { ...state, sharedSecret: "" }, {
      ...state,
      sharedSecret: undefined,
    }]
  ) {
    for (const rawBody of [delivery(""), delivery(null)]) {
      const err = await assertRejects(() => ingest({ state: s, rawBody }));
      assertEquals(err.message.includes("secret"), true);
    }
  }
});

test("formstack: onSubscribe registers a random shared secret, replaces leftovers, and stores what it sent", async () => {
  const m = mockCtx([
    { body: { webhooks: [{ id: 9, url: callbackUrl }, { id: 10, url: "https://x.test" }] } },
    { status: 204 },
    { status: 201, body: { id: 55, url: callbackUrl } },
  ]);
  const got = await trigger.onSubscribe!(
    { params: { formId: "1234567" }, callbackUrl, subscriptionId: "sub", hostUrl: "https://h" },
    m.ctx,
  );
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://www.formstack.com/api/v2025/forms/1234567/webhooks"],
    ["DELETE", "https://www.formstack.com/api/v2025/forms/1234567/webhooks/9"],
    ["POST", "https://www.formstack.com/api/v2025/forms/1234567/webhooks"],
  ]);
  const sent = JSON.parse(m.calls[2].body!);
  assertEquals(/^[0-9a-f]{64}$/.test(sent.sharedSecret), true);
  assertEquals(sent, {
    name: "w6w new-submission",
    url: callbackUrl,
    contentType: "json",
    sharedSecret: sent.sharedSecret,
  });
  assertEquals(got, { webhookId: "55", formId: "1234567", sharedSecret: sent.sharedSecret });
});

test("formstack: onSubscribe needs a form id and onUnsubscribe tolerates a gone webhook", async () => {
  const m = mockCtx();
  await assertRejects(() =>
    trigger.onSubscribe!(
      { params: {}, callbackUrl, subscriptionId: "s", hostUrl: "h" },
      m.ctx,
    )
  );
  assertEquals(m.calls.length, 0);

  const d = mockCtx([{ status: 204 }]);
  await trigger.onUnsubscribe!({ params: {}, state, subscriptionId: "sub" }, d.ctx);
  assertEquals(d.calls.map((c) => [c.method, c.url]), [[
    "DELETE",
    "https://www.formstack.com/api/v2025/forms/1234567/webhooks/55",
  ]]);
  for (const status of [404, 410]) {
    await trigger.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockCtx([{ status, body: { status: "error", error: "gone" } }]).ctx,
    );
  }
  await assertRejects(() =>
    trigger.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockCtx([{ status: 500, body: { status: "error", error: "boom" } }]).ctx,
    )
  );
});

test("formstack: declares output and a sample", () => {
  assertEquals(Array.isArray(trigger.output) && trigger.output.length > 0, true);
  assertEquals(trigger.sample !== undefined, true);
});
