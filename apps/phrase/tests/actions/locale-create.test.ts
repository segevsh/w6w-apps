import { assert, assertEquals, assertRejects } from "@std/assert";
import localeCreate from "../../actions/locale-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("locale-create: sends POST /v2/projects/project%201%2Fx/locales", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "name": "v_name",
    "code": "v_code",
    "branch": "v_branch",
    "default": true,
    "main": true,
    "rtl": true,
    "sourceLocaleId": "v_sourceLocaleId",
    "fallbackLocaleId": "v_fallbackLocaleId",
    "autotranslate": true,
  };
  const out = await localeCreate.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/locales");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "v_name",
    "code": "v_code",
    "branch": "v_branch",
    "default": true,
    "main": true,
    "rtl": true,
    "source_locale_id": "v_sourceLocaleId",
    "fallback_locale_id": "v_fallbackLocaleId",
    "autotranslate": true,
  });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("locale-create: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await localeCreate.execute({
      "projectId": "project 1/x",
      "name": "v_name",
      "code": "v_code",
      "branch": "v_branch",
      "default": true,
      "main": true,
      "rtl": true,
      "sourceLocaleId": "v_sourceLocaleId",
      "fallbackLocaleId": "v_fallbackLocaleId",
      "autotranslate": true,
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("locale-create: declares key, type and every param it reads", () => {
  assertEquals(localeCreate.key, "locale-create");
  assertEquals(localeCreate.type, "perform");
  const declared = new Set((localeCreate.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "name": "v_name",
      "code": "v_code",
      "branch": "v_branch",
      "default": true,
      "main": true,
      "rtl": true,
      "sourceLocaleId": "v_sourceLocaleId",
      "fallbackLocaleId": "v_fallbackLocaleId",
      "autotranslate": true,
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
