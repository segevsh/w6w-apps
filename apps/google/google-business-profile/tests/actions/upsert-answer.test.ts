import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upsert-answer.ts";

test("upsert-answer: POSTs /v1/locations/{id}/questions/{qid}/answers:upsert", async () => {
  const body = { name: "locations/1/questions/2/answers/3", text: "Yes, we open at 8am." };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({
    locationId: "1",
    questionId: "2",
    text: "Yes, we open at 8am.",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/locations/1/questions/2/answers:upsert");
  assertEquals(JSON.parse(calls[0].body!), { answer: { text: "Yes, we open at 8am." } });
  assertEquals(result, body);
});
