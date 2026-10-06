import { assert, assertEquals, assertRejects } from "@std/assert";
import translationGet from "../../actions/translation-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("translation-get: sends GET /v2/projects/project%201%2Fx/translations/translation%201%2Fx", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "translationId": "translation 1/x",
    "branch": "v_branch",
  };
  const out = await translationGet.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/projects/project%201%2Fx/translations/translation%201%2Fx",
  );
  assertEquals(queryOf(calls[0].url), { "branch": "v_branch" });
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("translation-get: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await translationGet.execute({
      "projectId": "project 1/x",
      "translationId": "translation 1/x",
      "branch": "v_branch",
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("translation-get: declares key, type and every param it reads", () => {
  assertEquals(translationGet.key, "translation-get");
  assertEquals(translationGet.type, "read");
  const declared = new Set((translationGet.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "translationId": "translation 1/x",
      "branch": "v_branch",
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
