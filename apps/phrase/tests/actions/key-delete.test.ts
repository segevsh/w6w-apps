import { assert, assertEquals, assertRejects } from "@std/assert";
import keyDelete from "../../actions/key-delete.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("key-delete: sends DELETE /v2/projects/project%201%2Fx/keys/key%201%2Fx", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const input = {
    "projectId": "project 1/x",
    "keyId": "key 1/x",
    "branch": "v_branch",
  };
  const out = await keyDelete.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/keys/key%201%2Fx");
  assertEquals(queryOf(calls[0].url), { "branch": "v_branch" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("key-delete: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await keyDelete.execute({
      "projectId": "project 1/x",
      "keyId": "key 1/x",
      "branch": "v_branch",
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("key-delete: declares key, type and every param it reads", () => {
  assertEquals(keyDelete.key, "key-delete");
  assertEquals(keyDelete.type, "perform");
  const declared = new Set((keyDelete.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "keyId": "key 1/x",
      "branch": "v_branch",
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
