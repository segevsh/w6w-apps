import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import languageCreate from "../../actions/language-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("language-create: wraps languages in the required array shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { languages: [{ lang_iso: "en" }], errors: [] } }]);
  await languageCreate.execute(
    { projectId: "p1", languages: '[{"lang_iso":"en"},{"lang_iso":"en_GB","custom_iso":"en-gb"}]' },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/languages");
  assertEquals(JSON.parse(calls[0].body!), {
    languages: [{ lang_iso: "en" }, { lang_iso: "en_GB", custom_iso: "en-gb" }],
  });
});

test("language-create: is not idempotent", () => {
  assertEquals(languageCreate.idempotent, false);
});
