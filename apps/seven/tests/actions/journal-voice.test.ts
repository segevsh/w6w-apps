import { assert, assertEquals } from "@std/assert";
import journalVoice from "../../actions/journal-voice.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "id": 1429729 } as Parameters<typeof journalVoice.execute>[0];

Deno.test("journal-voice: GET /api/journal/voice with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": "1429729", "status": "completed" }] }]);
  const out = await journalVoice.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/journal/voice");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), { "id": "1429729" });
  assertEquals(calls[0].body, null);
  assertEquals((out.entries as unknown[]).length, 1);
});

Deno.test("journal-voice: declares type read-or-search and every required param", () => {
  const required = (journalVoice.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(journalVoice.type));
  assertEquals(journalVoice.type === "perform", false);
});

Deno.test("journal-voice: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await journalVoice.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
