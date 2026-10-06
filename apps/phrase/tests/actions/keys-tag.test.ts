import { assert, assertEquals, assertRejects } from "@std/assert";
import keysTag from "../../actions/keys-tag.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("keys-tag: sends PATCH /v2/projects/project%201%2Fx/keys/tag", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "tags": "a,b",
    "q": "v_q",
    "localeId": "v_localeId",
    "branch": "v_branch",
  };
  const out = await keysTag.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/keys/tag");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "tags": "a,b",
    "q": "v_q",
    "locale_id": "v_localeId",
    "branch": "v_branch",
  });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("keys-tag: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await keysTag.execute({
      "projectId": "project 1/x",
      "tags": "a,b",
      "q": "v_q",
      "localeId": "v_localeId",
      "branch": "v_branch",
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("keys-tag: declares key, type and every param it reads", () => {
  assertEquals(keysTag.key, "keys-tag");
  assertEquals(keysTag.type, "perform");
  const declared = new Set((keysTag.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "tags": "a,b",
      "q": "v_q",
      "localeId": "v_localeId",
      "branch": "v_branch",
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
