import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import enterpriseUsersList from "../../actions/enterprise-users-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("enterprise-users-list: GETs /v3/enterprise/users with no format param (always JSON)", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ userId: "u1", email: "a@acme.example", role: "admin" }],
  }]);
  const out = await enterpriseUsersList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/enterprise/users");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { users: [{ userId: "u1", email: "a@acme.example", role: "admin" }] });
});
