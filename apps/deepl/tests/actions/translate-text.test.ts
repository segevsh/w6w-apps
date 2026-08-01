import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/translate-text.ts";
import { PRO_URL } from "../../lib/client.ts";

Deno.test("translate-text: POSTs /v2/translate with a one-element text array", async () => {
  const body = {
    translations: [{ detected_source_language: "EN", text: "Hallo", billed_characters: 5 }],
  };
  const { ctx, calls } = mockCtx([{ body }], { display: { plan: "pro" } });
  const result = await action.execute!(
    { text: "Hello", targetLang: "DE" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.origin, PRO_URL);
  assertEquals(url.pathname, "/v2/translate");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { text: ["Hello"], target_lang: "DE" });
  assertEquals(result, {
    text: "Hallo",
    detectedSourceLanguage: "EN",
    billedCharacters: 5,
  });
});

Deno.test("translate-text: forwards optional params with snake_case keys", async () => {
  const body = { translations: [{ detected_source_language: "EN", text: "x" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!(
    {
      text: "hi",
      targetLang: "FR",
      sourceLang: "EN",
      splitSentences: "0",
      preserveFormatting: true,
      formality: "more",
      glossaryId: "gl-1",
      tagHandling: "html",
      context: "an email footer",
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.source_lang, "EN");
  assertEquals(sent.split_sentences, "0");
  assertEquals(sent.preserve_formatting, true);
  assertEquals(sent.formality, "more");
  assertEquals(sent.glossary_id, "gl-1");
  assertEquals(sent.tag_handling, "html");
  assertEquals(sent.context, "an email footer");
});

Deno.test("translate-text: omits unset optional params from the request body", async () => {
  const body = { translations: [{ detected_source_language: "EN", text: "x" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ text: "hi", targetLang: "FR" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent).sort(), ["target_lang", "text"]);
});
