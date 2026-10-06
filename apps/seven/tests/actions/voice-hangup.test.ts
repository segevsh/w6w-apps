import { assert, assertEquals } from "@std/assert";
import voiceHangup from "../../actions/voice-hangup.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = { "call_id": "123456" } as Parameters<typeof voiceHangup.execute>[0];

Deno.test("voice-hangup: POST /api/voice/123456/hangup with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "error": null } }]);
  const out = await voiceHangup.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/voice/123456/hangup");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.success, true);
});

Deno.test("voice-hangup: declares type perform and every required param", () => {
  const required = (voiceHangup.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["call_id"]);
  assert(["read", "search", "perform"].includes(voiceHangup.type));
  assertEquals(voiceHangup.type, "perform");
});

Deno.test("voice-hangup: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await voiceHangup.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
