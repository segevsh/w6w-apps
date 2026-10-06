import { assert, assertEquals, assertRejects } from "@std/assert";
import translationCreate from "../../actions/translation-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("translation-create: sends POST /v2/projects/project%201%2Fx/translations", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "localeId": "v_localeId",
    "keyId": "v_keyId",
    "content": "v_content",
    "branch": "v_branch",
    "pluralSuffix": "v_pluralSuffix",
    "unverified": true,
    "excluded": true,
    "autotranslate": true,
    "reviewed": true,
  };
  const out = await translationCreate.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/translations");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "locale_id": "v_localeId",
    "key_id": "v_keyId",
    "content": "v_content",
    "branch": "v_branch",
    "plural_suffix": "v_pluralSuffix",
    "unverified": true,
    "excluded": true,
    "autotranslate": true,
    "reviewed": true,
  });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("translation-create: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await translationCreate.execute({
      "projectId": "project 1/x",
      "localeId": "v_localeId",
      "keyId": "v_keyId",
      "content": "v_content",
      "branch": "v_branch",
      "pluralSuffix": "v_pluralSuffix",
      "unverified": true,
      "excluded": true,
      "autotranslate": true,
      "reviewed": true,
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("translation-create: declares key, type and every param it reads", () => {
  assertEquals(translationCreate.key, "translation-create");
  assertEquals(translationCreate.type, "perform");
  const declared = new Set((translationCreate.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "localeId": "v_localeId",
      "keyId": "v_keyId",
      "content": "v_content",
      "branch": "v_branch",
      "pluralSuffix": "v_pluralSuffix",
      "unverified": true,
      "excluded": true,
      "autotranslate": true,
      "reviewed": true,
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
