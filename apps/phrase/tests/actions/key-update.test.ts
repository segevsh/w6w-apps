import { assert, assertEquals, assertRejects } from "@std/assert";
import keyUpdate from "../../actions/key-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("key-update: sends PATCH /v2/projects/project%201%2Fx/keys/key%201%2Fx", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "keyId": "key 1/x",
    "name": "v_name",
    "branch": "v_branch",
    "description": "v_description",
    "tags": "a,b",
    "plural": true,
    "namePlural": "v_namePlural",
    "dataType": "string",
    "maxCharactersAllowed": 2,
    "unformatted": true,
  };
  const out = await keyUpdate.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/keys/key%201%2Fx");
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
  });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("key-update: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await keyUpdate.execute({
      "projectId": "project 1/x",
      "keyId": "key 1/x",
      "name": "v_name",
      "branch": "v_branch",
      "description": "v_description",
      "tags": "a,b",
      "plural": true,
      "namePlural": "v_namePlural",
      "dataType": "string",
      "maxCharactersAllowed": 2,
      "unformatted": true,
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("key-update: declares key, type and every param it reads", () => {
  assertEquals(keyUpdate.key, "key-update");
  assertEquals(keyUpdate.type, "perform");
  const declared = new Set((keyUpdate.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "keyId": "key 1/x",
      "name": "v_name",
      "branch": "v_branch",
      "description": "v_description",
      "tags": "a,b",
      "plural": true,
      "namePlural": "v_namePlural",
      "dataType": "string",
      "maxCharactersAllowed": 2,
      "unformatted": true,
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
