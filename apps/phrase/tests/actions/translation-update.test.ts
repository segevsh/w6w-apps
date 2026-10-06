import { assert, assertEquals, assertRejects } from "@std/assert";
import translationUpdate from "../../actions/translation-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("translation-update: sends PATCH /v2/projects/project%201%2Fx/translations/translation%201%2Fx", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "translationId": "translation 1/x",
    "content": "v_content",
    "branch": "v_branch",
    "pluralSuffix": "v_pluralSuffix",
    "unverified": true,
    "excluded": true,
    "autotranslate": true,
    "reviewed": true,
    "minorChange": true,
  };
  const out = await translationUpdate.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PATCH");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/projects/project%201%2Fx/translations/translation%201%2Fx",
  );
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "content": "v_content",
    "branch": "v_branch",
    "plural_suffix": "v_pluralSuffix",
    "unverified": true,
    "excluded": true,
    "autotranslate": true,
    "reviewed": true,
    "minor_change": true,
  });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("translation-update: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await translationUpdate.execute({
      "projectId": "project 1/x",
      "translationId": "translation 1/x",
      "content": "v_content",
      "branch": "v_branch",
      "pluralSuffix": "v_pluralSuffix",
      "unverified": true,
      "excluded": true,
      "autotranslate": true,
      "reviewed": true,
      "minorChange": true,
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("translation-update: declares key, type and every param it reads", () => {
  assertEquals(translationUpdate.key, "translation-update");
  assertEquals(translationUpdate.type, "perform");
  const declared = new Set((translationUpdate.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "translationId": "translation 1/x",
      "content": "v_content",
      "branch": "v_branch",
      "pluralSuffix": "v_pluralSuffix",
      "unverified": true,
      "excluded": true,
      "autotranslate": true,
      "reviewed": true,
      "minorChange": true,
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
