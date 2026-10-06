import { assertEquals } from "@std/assert";
import fieldAnswerSet from "../../actions/field-answer-set.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("field-answer-set: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await fieldAnswerSet.execute(
    {
      "customFieldId": 7,
      "identifier": "x-identifier",
      "answer": '["Yes"]',
      "contactId": 7,
      "eventCallId": 7,
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/fields/answer");
  assertEquals(JSON.parse(calls[0].body!), {
    "customFieldId": 7,
    "identifier": "x-identifier",
    "answer": ["Yes"],
    "contactId": 7,
    "eventCallId": 7,
  });
  assertEquals(out, REPLY);
});

Deno.test("field-answer-set: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await fieldAnswerSet.execute({} as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("field-answer-set: declares a perform action's idempotency", () => {
  assertEquals(fieldAnswerSet.type, "perform");
  assertEquals(fieldAnswerSet.idempotent, true);
  assertEquals(fieldAnswerSet.params!.filter((p) => p.required).map((p) => p.key), []);
});
