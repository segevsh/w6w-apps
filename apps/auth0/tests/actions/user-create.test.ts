import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-create.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("user-create: posts the user into a named connection", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { user_id: "auth0|1" } }], conn);
  await action.execute!({
    connection: "Username-Password-Authentication",
    email: "ada@example.com",
    appMetadata: '{"plan":"pro"}',
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/users");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.connection, "Username-Password-Authentication");
  assertEquals(sent.app_metadata, { plan: "pro" });
});

/** A user exists in a connection, not in a tenant. */
Deno.test("user-create: a missing connection is refused with the reason", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ email: "ada@example.com" }, ctx),
    Error,
  );
  assert(/exists in a connection/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

Deno.test("user-create: a missing email is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ connection: "db" }, ctx),
    Error,
    "email",
  );
});

/** The metadata split is the thing worth getting right. */
Deno.test("user-create: the metadata hints distinguish who can edit what", () => {
  const params = action.params as Array<{ key: string; hint?: string }>;
  assert(/USER may change/.test(params.find((p) => p.key === "userMetadata")!.hint!));
  assert(/user cannot edit/.test(params.find((p) => p.key === "appMetadata")!.hint!));
});
