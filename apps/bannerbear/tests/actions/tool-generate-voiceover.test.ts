import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import toolGenerateVoiceover from "../../actions/tool-generate-voiceover.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

test("tool-generate-voiceover: POST /tools/generate_voiceover", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: { uid: "j1", tool: "generate_voiceover" },
  }]);
  await toolGenerateVoiceover.execute({ text: "Hello there", voice: "adam" }, ctx);

  assertEquals(pathOf(calls[0].url), "/tools/generate_voiceover");
  assertEquals(JSON.parse(calls[0].body!), { text: "Hello there", voice: "adam" });
});

test("tool-generate-voiceover: requires text", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolGenerateVoiceover.execute({ text: "" }, ctx));
});
