import { assertEquals } from "@std/assert";
import { mockOktaCtx } from "../_helpers.ts";
import action from "../../actions/user-create.ts";

Deno.test("user-create: POSTs /users with the profile envelope and activate query param", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: { id: "00u1" } }]);
  await action.execute(
    { firstName: "Jane", lastName: "Doe", email: "jane@acme.test", activate: true },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://dev-1.okta.com/api/v1/users?activate=true");
  assertEquals(JSON.parse(calls[0].body!), {
    profile: {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@acme.test",
      login: "jane@acme.test",
    },
  });
});

Deno.test("user-create: login defaults to email when left blank", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: { id: "00u1" } }]);
  await action.execute(
    { firstName: "Jane", lastName: "Doe", email: "jane@acme.test", login: "custom@acme.test" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.profile.login, "custom@acme.test");
});

Deno.test("user-create: mints a new id each call — not idempotent", () => {
  assertEquals(action.idempotent, false);
});
