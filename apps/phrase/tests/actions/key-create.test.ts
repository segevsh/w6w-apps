import { assert, assertEquals, assertRejects } from "@std/assert";
import keyCreate from "../../actions/key-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("key-create: sends POST /v2/projects/project%201%2Fx/keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "name": "v_name",
    "branch": "v_branch",
    "description": "v_description",
    "tags": "a,b",
    "plural": true,
    "namePlural": "v_namePlural",
    "dataType": "string",
    "maxCharactersAllowed": 2,
    "unformatted": true,
    "defaultTranslationContent": "v_defaultTranslationContent",
    "autotranslate": true,
  };
  const out = await keyCreate.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/keys");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "v_name",
    "branch": "v_branch",
    "description": "v_description",
    "tags": "a,b",
    "plural": true,
    "name_plural": "v_namePlural",
    "data_type": "string",
    "max_characters_allowed": 2,
    "unformatted": true,
    "default_translation_content": "v_defaultTranslationContent",
    "autotranslate": true,
  });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("key-create: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await keyCreate.execute({
      "projectId": "project 1/x",
      "name": "v_name",
      "branch": "v_branch",
      "description": "v_description",
      "tags": "a,b",
      "plural": true,
      "namePlural": "v_namePlural",
      "dataType": "string",
      "maxCharactersAllowed": 2,
      "unformatted": true,
      "defaultTranslationContent": "v_defaultTranslationContent",
      "autotranslate": true,
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("key-create: declares key, type and every param it reads", () => {
  assertEquals(keyCreate.key, "key-create");
  assertEquals(keyCreate.type, "perform");
  const declared = new Set((keyCreate.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "name": "v_name",
      "branch": "v_branch",
      "description": "v_description",
      "tags": "a,b",
      "plural": true,
      "namePlural": "v_namePlural",
      "dataType": "string",
      "maxCharactersAllowed": 2,
      "unformatted": true,
      "defaultTranslationContent": "v_defaultTranslationContent",
      "autotranslate": true,
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
