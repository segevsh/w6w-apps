import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/delete-person.ts";

test("delete-person: DELETEs /people/{id} with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7 } }]);
  await action.execute({ personId: 7 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/people/7");
  assertEquals(calls[0].body, null);
});

test("delete-person: survives a 204 with no body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute({ personId: 7 }, ctx), undefined);
});

test("delete-person: is an idempotent perform requiring an id", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(param(action, "personId").required, true);
});
