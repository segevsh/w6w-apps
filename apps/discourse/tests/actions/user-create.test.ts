import { assert, assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/user-create.ts";

const REQUIRED = {
  name: "Alice",
  email: "alice@example.test",
  username: "alice",
  password: "correct-horse-battery-staple",
};

Deno.test("user-create: POSTs /users.json with all four required fields", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { success: true, user_id: 9 } }]);
  const out = await action.execute(REQUIRED, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/users.json`);
  assertEquals(JSON.parse(calls[0].body!), REQUIRED);
  assertEquals(out, { success: true, user_id: 9 });
});

Deno.test("user-create: the endpoint's four required fields are all required in the form", () => {
  // There is no invite-only mode on this route: name, email, password and
  // username are all required by Discourse's own schema.
  assertEquals(
    action.params!.filter((p) => p.required).map((p) => p.key),
    ["name", "email", "username", "password"],
  );
});

Deno.test("user-create: the new account's password is masked", () => {
  const password = action.params!.find((p) => p.key === "password")!;
  assertEquals(password.type, "secret");
});

Deno.test("user-create: `active` warns that a non-admin key silently ignores it", () => {
  const active = action.params!.find((p) => p.key === "active")!;
  assert(/admin/i.test(active.hint!));
  assert(/ignore|silently/i.test(active.hint!));
});

Deno.test("user-create: optional flags and custom fields use the API's names", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute(
    { ...REQUIRED, active: true, approved: true, userFields: { "1": true } },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.active, true);
  assertEquals(body.approved, true);
  assertEquals(body.user_fields, { "1": true });
});

Deno.test("user-create: is not idempotent — email and username are unique", () => {
  assertEquals(action.idempotent, false);
});
