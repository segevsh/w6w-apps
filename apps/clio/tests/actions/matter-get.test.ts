import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import matterGet from "../../actions/matter-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("matter-get: calls GET /matters/{id}.json and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1, description: "Estate plan" }) }]);
  const out = await matterGet.execute({ id: 1 }, ctx) as { description: string };
  assertEquals(pathOf(calls[0].url), "/api/v4/matters/1.json");
  assertEquals(out.description, "Estate plan");
});

test("matter-get: an explicit fields value is forwarded verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1 }) }]);
  await matterGet.execute({ id: 1, fields: "id,etag" }, ctx);
  assertEquals(queryOf(calls[0].url).fields, "id,etag");
});
