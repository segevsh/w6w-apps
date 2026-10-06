import { assertEquals } from "@std/assert";
import action from "../../actions/list-cloned-voices.ts";
import { exec, failure, mockCtx } from "../_helpers.ts";

Deno.test("list-cloned-voices: GETs /v1/speech/voices/cloned and counts", async () => {
  const voices = [{
    voiceId: "cln_1",
    displayName: "Me",
    tag: "me",
    createdAt: "2026-01-01T00:00:00Z",
  }];
  const { ctx, calls } = mockCtx([{ body: voices }]);
  const out = await exec(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.murf.ai/v1/speech/voices/cloned");
  assertEquals(out, { voices, count: 1 });
});

Deno.test("list-cloned-voices: a 403 or a non-array body fails", async () => {
  const a = mockCtx([{ status: 403, body: { error_message: "Forbidden", error_code: 403 } }]);
  assertEquals((await failure(action, {}, a.ctx)).includes("Forbidden"), true);
  const b = mockCtx([{ body: { x: 1 } }]);
  assertEquals((await failure(action, {}, b.ctx)).includes("unexpected"), true);
});
