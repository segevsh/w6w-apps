import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-find.ts";

/** An unknown contact is an empty array, not a 404. */
test("contact-find: queries by email and returns the array as given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "c1", email: "ada@example.com" }] }]);
  const result = await action.execute!({ email: "ada@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/contacts/find");
  assertEquals(new URL(calls[0].url).searchParams.get("email"), "ada@example.com");
  assertEquals(result, [{ id: "c1", email: "ada@example.com" }]);
});

test("contact-find: an unknown contact comes back as an empty array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  assertEquals(await action.execute!({ userId: "u1" }, ctx), []);
});

test("contact-find: naming neither identity is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "`contact-find` needs a contact",
  );
  assertEquals(calls.length, 0);
  assert(action.type === "read");
});
