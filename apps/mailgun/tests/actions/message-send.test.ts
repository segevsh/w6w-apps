import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send.ts";

function baseInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    domain: "mg.example.com",
    fromEmail: "sender@example.com",
    toEmail: "rcpt@example.com",
    subject: "hello",
    text: "body",
    ...overrides,
  };
}

Deno.test("message-send: happy path posts multipart/form-data to /v3/{domain}/messages", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "<abc@mg>", message: "Queued" } }]);
  const result = await action.execute!(baseInput(), ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.mailgun.net/v3/mg.example.com/messages");
  assertEquals(calls[0].method, "POST");
  assert(calls[0].formData, "expected a multipart/form-data body");
  const form = calls[0].formData!;
  assertEquals(form.get("from"), "sender@example.com");
  assertEquals(form.get("to"), "rcpt@example.com");
  assertEquals(form.get("subject"), "hello");
  assertEquals(form.get("text"), "body");
  assertEquals(result, { id: "<abc@mg>", message: "Queued" });
});

Deno.test("message-send: honors region — routes to the EU host", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: {} }],
    { connection: { display: { region: "eu" } } },
  );
  await action.execute!(baseInput(), ctx);
  assertEquals(calls[0].url, "https://api.eu.mailgun.net/v3/mg.example.com/messages");
});

Deno.test("message-send: fromName wraps the address as `Name <email>`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(baseInput({ fromName: "Alice" }), ctx);
  assertEquals(calls[0].formData!.get("from"), "Alice <sender@example.com>");
});

Deno.test("message-send: splits comma-separated to/cc/bcc into repeated fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    baseInput({
      toEmail: "a@x.com, b@x.com",
      additionalFields: { ccEmail: "cc@x.com", bccEmail: "bcc@x.com" },
    }),
    ctx,
  );
  const form = calls[0].formData!;
  assertEquals(form.getAll("to"), ["a@x.com", "b@x.com"]);
  assertEquals(form.getAll("cc"), ["cc@x.com"]);
  assertEquals(form.getAll("bcc"), ["bcc@x.com"]);
});

Deno.test("message-send: replyTo, tags, testMode and tracking flags map to o:/h: fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    baseInput({
      additionalFields: {
        replyTo: "reply@x.com",
        tags: "a, b",
        testMode: true,
        trackingOpens: true,
        trackingClicks: false,
      },
    }),
    ctx,
  );
  const form = calls[0].formData!;
  assertEquals(form.get("h:Reply-To"), "reply@x.com");
  assertEquals(form.getAll("o:tag"), ["a", "b"]);
  assertEquals(form.get("o:testmode"), "yes");
  assertEquals(form.get("o:tracking-opens"), "yes");
  assertEquals(form.get("o:tracking-clicks"), "no");
});

Deno.test("message-send: custom headers become h:<name>", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    baseInput({ additionalFields: { customHeaders: [{ name: "X-Custom", value: "v1" }] } }),
    ctx,
  );
  assertEquals(calls[0].formData!.get("h:X-Custom"), "v1");
});

Deno.test("message-send: attachments are decoded from a data URL into a Blob part", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const dataUrl = `data:text/plain;base64,${btoa("hi there")}`;
  await action.execute!(
    baseInput({
      additionalFields: { attachments: [{ filename: "note.txt", content: dataUrl }] },
    }),
    ctx,
  );
  const part = calls[0].formData!.get("attachment");
  // `File` extends `Blob` in both the browser and Deno's runtime — checking
  // `Blob` alone avoids depending on `File` being separately typed here.
  assert(part instanceof Blob, "expected a Blob/File attachment part");
  const text = await (part as Blob).text();
  assertEquals(text, "hi there");
});

Deno.test("message-send: missing required fields reject with informative errors", async () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["domain", { domain: "" }],
    ["fromEmail", { fromEmail: "" }],
    ["toEmail", { toEmail: "" }],
    ["subject", { subject: "" }],
  ];
  for (const [field, patch] of cases) {
    const { ctx } = mockCtx();
    await assertRejects(
      async () => await action.execute!(baseInput(patch), ctx),
      Error,
      `\`${field}\``,
    );
  }
});

Deno.test("message-send: rejects when neither text nor html is set", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!(baseInput({ text: "" }), ctx),
    Error,
    "text",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-send: html alone (no text) is accepted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(baseInput({ text: "", html: "<p>hi</p>" }), ctx);
  assertEquals(calls[0].formData!.get("html"), "<p>hi</p>");
  assertEquals(calls[0].formData!.get("text"), null);
});

Deno.test("message-send: non-2xx response propagates as Error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: '{"message":"Forbidden"}' }]);
  const err = await assertRejects(
    async () => await action.execute!(baseInput(), ctx),
    Error,
    "returned 401",
  );
  assert(err.message.includes("Forbidden"), "should include upstream error text");
});

// ── Flattened optional fields ──────────────────────────────────────────────
// CC/BCC and every option below used to sit inside a `type: "group"`, which the
// studio renders as a raw JSON editor — so none of them were reachable as form
// fields. Same defect, and same fix, as SendGrid's `mail-send`.

function base(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    domain: "mg.example.com",
    fromEmail: "s@example.com",
    toEmail: "r@example.com",
    subject: "hi",
    text: "body",
    ...overrides,
  };
}

Deno.test("message-send: cc/bcc/replyTo are read from flat params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "<1>" } }]);
  await action.execute!(
    base({ ccEmail: "c1@x.com, c2@x.com", bccEmail: "b@x.com", replyTo: "reply@x.com" }),
    ctx,
  );
  const form = calls[0].formData!;
  assertEquals(form.getAll("cc"), ["c1@x.com", "c2@x.com"]);
  assertEquals(form.getAll("bcc"), ["b@x.com"]);
  assertEquals(form.get("h:Reply-To"), "reply@x.com");
});

Deno.test("message-send: a flat field wins over the deprecated group", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    base({
      ccEmail: "new@x.com",
      additionalFields: { ccEmail: "old@x.com", bccEmail: "kept@x.com" },
    }),
    ctx,
  );
  const form = calls[0].formData!;
  assertEquals(form.getAll("cc"), ["new@x.com"]);
  // ...and a key the flat form left empty still falls back to the old group.
  assertEquals(form.getAll("bcc"), ["kept@x.com"]);
});

Deno.test("message-send: an empty declared default does not shadow the fallback", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    base({
      customHeaders: [],
      additionalFields: { customHeaders: [{ name: "X-A", value: "1" }] },
    }),
    ctx,
  );
  assertEquals((calls[0].formData!).get("h:X-A"), "1");
});

Deno.test("message-send: delivery time is sent as RFC 2822, not ISO 8601", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(base({ deliveryTime: "2026-09-01T10:00:00Z" }), ctx);
  // Mailgun rejects an ISO timestamp on `o:deliverytime`.
  assertEquals(
    (calls[0].formData!).get("o:deliverytime"),
    new Date("2026-09-01T10:00:00Z").toUTCString(),
  );
});

Deno.test("message-send: an unparseable delivery time rejects before the request", async () => {
  const { ctx, calls } = mockCtx();
  let threw = false;
  try {
    await action.execute!(base({ deliveryTime: "not a date" }), ctx);
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("deliveryTime"), true);
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

Deno.test("message-send: custom variables are sent as v: fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(base({ customVariables: { orderId: "42", meta: { a: 1 } } }), ctx);
  const form = calls[0].formData!;
  assertEquals(form.get("v:orderId"), "42");
  // Non-string values are JSON-encoded rather than stringified to [object Object].
  assertEquals(form.get("v:meta"), '{"a":1}');
});

Deno.test("message-send: no param is buried in a `group` the studio renders as JSON", () => {
  const walk = (list: typeof action.params): string[] =>
    (list ?? []).flatMap((p) => [
      ...(p.type === "group" ? [p.key] : []),
      ...walk(p.children),
    ]);
  assertEquals(walk(action.params), []);
});
