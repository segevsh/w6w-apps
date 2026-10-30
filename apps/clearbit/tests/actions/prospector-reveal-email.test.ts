import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/prospector-reveal-email.ts";

test("prospector-reveal-email: GETs prospector.clearbit.com/v1/people/{id}/email", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "tristan@clearbit.com", verified: true } }]);
  const result = await action.execute!({ personId: "e_1234" }, ctx);
  assertEquals(calls[0].url, "https://prospector.clearbit.com/v1/people/e_1234/email");
  assertEquals(result, { email: "tristan@clearbit.com", verified: true });
});

test("prospector-reveal-email: requires personId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ personId: "" }, ctx), Error, "personId");
  assertEquals(calls.length, 0);
});
