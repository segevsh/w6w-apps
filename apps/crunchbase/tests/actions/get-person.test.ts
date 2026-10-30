import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-person.ts";

test("get-person: GETs the person entity path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { properties: { name: "Ada" } } }]);
  await action.execute!({ entityId: "ada-lovelace" }, ctx);
  assertEquals(calls[0].url, "https://api.crunchbase.com/v4/data/entities/people/ada-lovelace");
});

test("get-person: entityId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ entityId: "" }, ctx),
    Error,
    "`entityId`",
  );
  assertEquals(calls.length, 0);
});
