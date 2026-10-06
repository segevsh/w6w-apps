import { assertEquals } from "@std/assert";
import action from "../../actions/translate-text.ts";
import { bodyOf, exec, failure, mockCtx } from "../_helpers.ts";

const reply = {
  translations: [{ source_text: "Hello", translated_text: "Hola" }],
  metadata: { credits_used: 1, target_language: "es_ES" },
};

Deno.test("translate-text: POSTs one entry per non-empty line", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await exec(action, { targetLanguage: " es_ES ", texts: "Hello\n\nWorld" }, ctx);
  assertEquals(calls[0].url, "https://api.murf.ai/v1/text/translate");
  assertEquals(bodyOf(calls[0]), { targetLanguage: "es_ES", texts: ["Hello", "World"] });
  assertEquals(out, reply);
});

Deno.test("translate-text: accepts a JSON array string or a real array", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }, { body: reply }]);
  await exec(action, { targetLanguage: "fr_FR", texts: '["a, b","c"]' }, ctx);
  await exec(action, { targetLanguage: "fr_FR", texts: ["x"] }, ctx);
  assertEquals(bodyOf(calls[0]).texts, ["a, b", "c"]);
  assertEquals(bodyOf(calls[1]).texts, ["x"]);
});

Deno.test("translate-text: validates input; a 402 fails with the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { error_message: "Out of credits", error_code: 402 },
  }]);
  assertEquals(
    (await failure(action, { targetLanguage: "", texts: "a" }, mockCtx().ctx)).includes(
      "targetLanguage",
    ),
    true,
  );
  assertEquals(
    (await failure(action, { targetLanguage: "es_ES", texts: " \n " }, mockCtx().ctx)).includes(
      "texts",
    ),
    true,
  );
  assertEquals(
    (await failure(action, { targetLanguage: "es_ES", texts: "a" }, ctx)).includes(
      "Out of credits",
    ),
    true,
  );
});
