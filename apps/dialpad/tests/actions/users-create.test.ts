import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import usersCreate from "../../actions/users-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("users-create: POSTs /users with office id coerced to a number", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await usersCreate.execute({ email: "a@b.com", officeId: "42", license: "talk" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/users");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "a@b.com",
    office_id: 42,
    license: "talk",
  });
});

test("users-create: declared non-idempotent", () => {
  assertEquals(usersCreate.idempotent, false);
});
