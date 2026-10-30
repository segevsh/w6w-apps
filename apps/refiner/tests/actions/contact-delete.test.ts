import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import contactDelete from "../../actions/contact-delete.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("contact-delete: DELETEs /v1/contact with the identifier in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  assertEquals(await contactDelete.execute({ uuid: "c1" }, ctx), { message: "ok" });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/contact");
  assertEquals(queryOf(calls[0].url), { uuid: "c1" });
});

test("contact-delete: refuses to run with no identifier (never a bulk delete)", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(contactDelete.execute({ id: "  " }, ctx)),
    Error,
    "provide one of",
  );
  assertEquals(calls.length, 0);
});

test("contact-delete: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(contactDelete.execute({ id: "u1" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
