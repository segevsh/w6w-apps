import { assert, assertEquals } from "@std/assert";
import voiceCall from "../../actions/voice-call.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "to": "4917612345678",
  "text": "Hello world!",
  "ringtime": 20,
  "foreign_id": "v1",
} as Parameters<typeof voiceCall.execute>[0];

Deno.test("voice-call: POST /api/voice with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": "100", "messages": [{ "id": 1384013, "success": true }] },
  }]);
  const out = await voiceCall.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/voice");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "to": "4917612345678",
    "text": "Hello world!",
    "ringtime": "20",
    "foreign_id": "v1",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out.success, "100");
});

Deno.test("voice-call: declares type perform and every required param", () => {
  const required = (voiceCall.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["text", "to"]);
  assert(["read", "search", "perform"].includes(voiceCall.type));
  assertEquals(voiceCall.type, "perform");
});

Deno.test("voice-call: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await voiceCall.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
