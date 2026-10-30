import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import listVoices from "../../actions/list-voices.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("list-voices: GETs /list-voices and wraps the bare array in {items}", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{
      voice_id: "retell-Cimo",
      voice_name: "Adrian",
      provider: "elevenlabs",
      gender: "male",
    }],
  }]);

  const out = await listVoices.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/list-voices");
  assertEquals(out.items.length, 1);
  assertEquals(out.items[0].voice_id, "retell-Cimo");
});

test("list-voices: takes no params — the vendor's response is not paginated", () => {
  assertEquals(listVoices.params, []);
});
