import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import videoTranslationLanguagesList from "../../actions/video-translation-languages-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("video-translation-languages-list: returns the exact vendor-published language names", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ languages: ["Spanish (Spain)", "French", "English"] }) },
  ]);
  const out = await videoTranslationLanguagesList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/video-translations/languages");
  assertEquals(out, { languages: ["Spanish (Spain)", "French", "English"] });
});

test("video-translation-languages-list: a missing languages field returns an empty list, not undefined", async () => {
  const { ctx } = mockCtx([{ body: envelope({}) }]);
  assertEquals(await videoTranslationLanguagesList.execute({}, ctx), { languages: [] });
});
