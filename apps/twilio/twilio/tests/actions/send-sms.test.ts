import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-sms.ts";

Deno.test("send-sms: POSTs form-encoded message to /Accounts/{sid}/Messages.json", async () => {
  const body = { sid: "SM123", status: "queued" };
  const { ctx, calls } = mockCtx([{ body }], {
    connection: { display: { accountSid: "AC_test" } },
  });

  const result = await action.execute!(
    { from: "+14155238886", to: "+14155551212", message: "hello" },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2010-04-01/Accounts/AC_test/Messages.json");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");

  const form = new URLSearchParams(calls[0].body ?? "");
  assertEquals(form.get("From"), "+14155238886");
  assertEquals(form.get("To"), "+14155551212");
  assertEquals(form.get("Body"), "hello");
  assertEquals(form.get("StatusCallback"), null);

  assertEquals(result, body);
});

Deno.test("send-sms: prefixes numbers with whatsapp: when toWhatsapp is true", async () => {
  const { ctx, calls } = mockCtx([{ body: { sid: "SM456" } }], {
    connection: { display: { accountSid: "AC_test" } },
  });

  await action.execute!(
    {
      from: "+14155238886",
      to: "+14155551212",
      message: "hi",
      toWhatsapp: true,
      statusCallback: "https://example.com/hook",
    },
    ctx,
  );

  const form = new URLSearchParams(calls[0].body ?? "");
  assertEquals(form.get("From"), "whatsapp:+14155238886");
  assertEquals(form.get("To"), "whatsapp:+14155551212");
  assertEquals(form.get("StatusCallback"), "https://example.com/hook");
});

// ── Sender, media, templates and scheduling ────────────────────────────────
// `from` used to be `required`, which made the Messaging Service path
// unreachable; and the action described itself as sending MMS while offering
// no way to attach anything.

const conn = { connection: { display: { accountSid: "AC_test" } } };

Deno.test("send-sms: media URLs encode as REPEATED MediaUrl parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], conn);
  await action.execute!(
    {
      from: "+1",
      to: "+2",
      message: "look",
      mediaUrls: ["https://x/a.jpg", "https://x/b.jpg"],
    },
    ctx,
  );
  const form = new URLSearchParams(calls[0].body ?? "");
  // Twilio takes multi-value parameters as repeated keys, not a comma-joined
  // single value — `getAll` is the assertion that matters here.
  assertEquals(form.getAll("MediaUrl"), ["https://x/a.jpg", "https://x/b.jpg"]);
});

Deno.test("send-sms: blank media rows are dropped and MediaUrl is omitted when empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], conn);
  await action.execute!({ from: "+1", to: "+2", message: "x", mediaUrls: ["", "  "] }, ctx);
  assertEquals(new URLSearchParams(calls[0].body ?? "").getAll("MediaUrl"), []);
});

Deno.test("send-sms: sends from a Messaging Service with no From", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], conn);
  await action.execute!(
    { messagingServiceSid: "MG123", to: "+2", message: "hi" },
    ctx,
  );
  const form = new URLSearchParams(calls[0].body ?? "");
  assertEquals(form.get("MessagingServiceSid"), "MG123");
  assertEquals(form.get("From"), null);
});

Deno.test("send-sms: exactly one sender is required", async () => {
  for (
    const [input, needle] of [
      [{ to: "+2", message: "x" }, "sender is required"],
      [{ from: "+1", messagingServiceSid: "MG1", to: "+2", message: "x" }, "not both"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([], conn);
    let threw = false;
    try {
      await action.execute!(input as never, ctx);
    } catch (e) {
      threw = true;
      assertEquals((e as Error).message.includes(needle), true);
    }
    assertEquals(threw, true);
    assertEquals(calls.length, 0);
  }
});

Deno.test("send-sms: scheduling sends ScheduleType=fixed alongside an ISO SendAt", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], conn);
  await action.execute!(
    {
      messagingServiceSid: "MG123",
      to: "+2",
      message: "later",
      sendAt: "2026-09-01T10:00:00Z",
    },
    ctx,
  );
  const form = new URLSearchParams(calls[0].body ?? "");
  assertEquals(form.get("ScheduleType"), "fixed");
  assertEquals(form.get("SendAt"), "2026-09-01T10:00:00.000Z");
});

Deno.test("send-sms: scheduling without a Messaging Service rejects before the request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!(
      { from: "+1", to: "+2", message: "later", sendAt: "2026-09-01T10:00:00Z" },
      ctx,
    );
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("messagingServiceSid"), true);
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

Deno.test("send-sms: content template variables are JSON-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], conn);
  await action.execute!(
    {
      from: "+1",
      to: "+2",
      message: "x",
      toWhatsapp: true,
      contentSid: "HX123",
      contentVariables: { "1": "Alice" },
    },
    ctx,
  );
  const form = new URLSearchParams(calls[0].body ?? "");
  assertEquals(form.get("ContentSid"), "HX123");
  assertEquals(form.get("ContentVariables"), '{"1":"Alice"}');
});

Deno.test("send-sms: a pre-encoded ContentVariables string is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], conn);
  await action.execute!(
    { from: "+1", to: "+2", message: "x", contentVariables: '{"1":"Bob"}' },
    ctx,
  );
  assertEquals(new URLSearchParams(calls[0].body ?? "").get("ContentVariables"), '{"1":"Bob"}');
});
