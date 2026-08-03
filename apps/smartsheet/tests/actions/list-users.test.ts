import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/list-users.ts";

Deno.test("list-users: is a read over the user resource", () => {
  assertEquals(action.key, "list-users");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "user");
});

Deno.test("list-users: GETs /users with no query by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/users");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-users: forwards the email filter and paging", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute(
    { email: "a@b.com, c@d.com", include: ["lastLogin"], page: 2, pageSize: 50 },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("email"), "a@b.com,c@d.com");
  assertEquals(q.get("include"), "lastLogin");
  assertEquals(q.get("page"), "2");
  assertEquals(q.get("pageSize"), "50");
});

Deno.test("list-users: offers lastLogin and warns about the four ways it disappears", () => {
  assertEquals(optionValues(action, "include"), ["lastLogin"]);
  const hint = param(action, "include").hint ?? "";
  assert(/Include all/i.test(hint));
  assert(/100/.test(hint));
  assert(/System Admin/i.test(hint));
});

Deno.test("list-users: says an admin-less failure is not a broken connection", () => {
  // The auth `test` hook deliberately probes /users/me instead, for this reason.
  assert(/admin/i.test(action.description!));
  assert(/not a sign of a broken connection/i.test(action.description!));
});
