import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSalesmateCtx } from "../_helpers.ts";
import users from "../../actions/user-get-many.ts";

const ok = (Data?: unknown) => ({ body: { Status: "success", Data } });
const B = "https://acme.salesmate.io/apis";

test("user-get-many: lists active users", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok([{ id: 1, firstName: "A" }])]);
  assertEquals(await users.execute({}, ctx), { users: [{ id: 1, firstName: "A" }] });
  assertEquals(calls[0].url, `${B}/core/v4/users?status=active`);
});
