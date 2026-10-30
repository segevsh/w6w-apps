import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/legal-entity-list.ts";

test("legal-entity-list: lists the entities contracts are signed under", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "le1" }], page: {} } }], {
    display: {},
  });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/legal-entities");
  assertEquals(result, [{ id: "le1" }]);
});
