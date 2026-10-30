import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import getRandomId from "../../actions/get-random-id.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("get-random-id: calls GET /v1/randomid and returns data.random_id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ random_id: "abc123" }) }]);
  const out = await getRandomId.execute({}, ctx) as { data: { random_id: string } };

  assertEquals(pathOf(calls[0].url), "/v1/randomid");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.data.random_id, "abc123");
});

test("get-random-id: no customer_id is sent — that advanced field is out of scope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ random_id: "abc123" }) }]);
  await getRandomId.execute({}, ctx);
  assertEquals("customer_id" in queryOf(calls[0].url), false);
  assertEquals(getRandomId.params, undefined);
});
