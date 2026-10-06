import { assertEquals } from "@std/assert";
import fieldAnswerBulkSet from "../../actions/field-answer-bulk-set.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("field-answer-bulk-set: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await fieldAnswerBulkSet.execute(
    {
      "contactIds": "[1, 2]",
      "customFieldId": 7,
      "identifier": "x-identifier",
      "answer": '["Yes"]',
      "overrideExisting": true,
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/fields/answer/bulk");
  assertEquals(JSON.parse(calls[0].body!), {
    "contactIds": [1, 2],
    "customFieldId": 7,
    "identifier": "x-identifier",
    "answer": ["Yes"],
    "overrideExisting": true,
  });
  assertEquals(out, REPLY);
});

Deno.test("field-answer-bulk-set: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await fieldAnswerBulkSet.execute({ "contactIds": "[1, 2]" } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "contactIds": [1, 2] });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("field-answer-bulk-set: declares a perform action's idempotency", () => {
  assertEquals(fieldAnswerBulkSet.type, "perform");
  assertEquals(fieldAnswerBulkSet.idempotent, true);
  assertEquals(fieldAnswerBulkSet.params!.filter((p) => p.required).map((p) => p.key), [
    "contactIds",
  ]);
});
