import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, compact, TelegramClient, TOKEN_PLACEHOLDER, unset } from "../../lib/client.ts";

Deno.test("client: leaves the token slot unfilled — only `sign` may fill it", () => {
  assertEquals(TOKEN_PLACEHOLDER, "bot{token}");
  assertEquals(API_URL, "https://api.telegram.org/bot{token}");
});

Deno.test("client: unwraps the Telegram envelope and returns `result`", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: { message_id: 7 } } }]);
  const out = await new TelegramClient(ctx).call("sendMessage", { body: { chat_id: "1" } });
  assertEquals(out, { message_id: 7 });
  assertEquals(calls[0].url, "https://api.telegram.org/bot%7Btoken%7D/sendMessage");
  assertEquals(calls[0].method, "POST");
});

Deno.test("client: sets no Authorization header (credentials belong to `sign`)", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  await new TelegramClient(ctx).call("getMe");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: a GET-shaped call carries its params in the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: {} } }]);
  await new TelegramClient(ctx).call("getChat", { query: { chat_id: "@acme", skip: undefined } });
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("chat_id"), "@acme");
  assertEquals(url.searchParams.has("skip"), false);
});

Deno.test("client: surfaces `ok: false` as an error even when the status is 200", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { ok: false, error_code: 400, description: "chat not found" } },
  ]);
  await assertRejects(
    () => new TelegramClient(ctx).call("sendMessage", { body: {} }),
    Error,
    "Telegram 400 for sendMessage: chat not found",
  );
});

Deno.test("client: surfaces a non-JSON response rather than swallowing it", async () => {
  const { ctx } = mockCtx([{ status: 502, statusText: "Bad Gateway", body: "<html>nope</html>" }]);
  await assertRejects(
    () => new TelegramClient(ctx).call("sendMessage", { body: {} }),
    Error,
    "non-JSON response",
  );
});

Deno.test("client: compact drops only unset values — an empty string is a real value", () => {
  // `setChatDescription` clears a description by sending "", so compaction must
  // not swallow it. Actions whose blank input means "unset" use `unset()`.
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    d: "",
    e: false,
    f: 0,
  });
});

Deno.test("client: unset() maps a blank form field to absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset(undefined), undefined);
  assertEquals(unset("HTML"), "HTML");
});
