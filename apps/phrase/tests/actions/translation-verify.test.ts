import { assert, assertEquals, assertRejects } from "@std/assert";
import translationVerify from "../../actions/translation-verify.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("translation-verify: sends PATCH /v2/projects/project%201%2Fx/translations/translation%201%2Fx/verify", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "translationId": "translation 1/x",
    "branch": "v_branch",
  };
  const out = await translationVerify.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PATCH");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/projects/project%201%2Fx/translations/translation%201%2Fx/verify",
  );
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "branch": "v_branch" });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("translation-verify: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await translationVerify.execute({
      "projectId": "project 1/x",
      "translationId": "translation 1/x",
      "branch": "v_branch",
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("translation-verify: declares key, type and every param it reads", () => {
  assertEquals(translationVerify.key, "translation-verify");
  assertEquals(translationVerify.type, "perform");
  const declared = new Set((translationVerify.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "translationId": "translation 1/x",
      "branch": "v_branch",
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
