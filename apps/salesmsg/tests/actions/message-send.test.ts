import { assert, assertEquals } from "@std/assert";
import messageSend from "../../actions/message-send.ts";
import { API_ROOT, mockCtx, queryOf, unauthorized } from "../_helpers.ts";

Deno.test("message-send: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await messageSend.execute({
    "number": "+15551234567",
    "team_id": 7,
    "message": "Hello",
    "media_urls": "https://x.test/a.png,https://x.test/b.png",
    "send_at": "2026-11-01T10:00:00Z",
  }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/messages`);
  const query = queryOf(calls[0].url);
  delete query["media_url[][url]"]; // repeated key, asserted in its own test
  assertEquals(query, {
    "number": "+15551234567",
    "team_id": "7",
    "message": "Hello",
    "send_at": "2026-11-01T10:00:00Z",
  });
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

Deno.test("message-send: repeats media_url[][url] once per URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await messageSend.execute({
    "number": "+15551234567",
    "team_id": 7,
    "message": "Hello",
    "media_urls": "https://x.test/a.png,https://x.test/b.png",
    "send_at": "2026-11-01T10:00:00Z",
  }, ctx);
  const urls = new URL(calls[0].url).searchParams.getAll("media_url[][url]");
  assertEquals(urls, ["https://x.test/a.png", "https://x.test/b.png"]);
});

Deno.test("message-send: is not idempotent — a retry would text a person twice", () => {
  assertEquals(messageSend.idempotent, false);
});

Deno.test("message-send: omits media when none is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await messageSend.execute({
    "number": "+15551234567",
    "team_id": 7,
    "message": "Hello",
    "send_at": "2026-11-01T10:00:00Z",
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("media_url[][url]"), false);
});

Deno.test("message-send: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await messageSend.execute({
      "number": "+15551234567",
      "team_id": 7,
      "message": "Hello",
      "media_urls": "https://x.test/a.png,https://x.test/b.png",
      "send_at": "2026-11-01T10:00:00Z",
    }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
