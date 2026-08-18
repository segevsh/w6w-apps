import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/link-token-create.ts";

const conn = { display: { environment: "sandbox" } };
const ok = {
  status: 200,
  body: { link_token: "link-sandbox-1", expiration: "2026-08-18T16:00:00Z" },
};

Deno.test("link-token-create: sends the user, products and countries", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({
    clientUserId: "user-1",
    clientName: "Acme",
    products: "transactions,auth",
    countryCodes: "US,CA",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(new URL(calls[0].url).pathname, "/link/token/create");
  assertEquals(sent.user, { client_user_id: "user-1" });
  assertEquals(sent.products, ["transactions", "auth"]);
  assertEquals(sent.country_codes, ["US", "CA"]);
});

/** Update mode repairs an Item rather than creating another. */
Deno.test("link-token-create: an access token switches to update mode and drops products", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({
    clientUserId: "user-1",
    clientName: "Acme",
    accessToken: "tok",
    products: "transactions",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.access_token, "tok");
  assertEquals("products" in sent, false);
});

Deno.test("link-token-create: the user id and app name are required", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ clientName: "Acme" }, ctx),
    Error,
    "clientUserId",
  );
  assertEquals(calls.length, 0);
});

/** A browser is required, and the app says so rather than pretending. */
Deno.test("link-token-create: explains what it is for", () => {
  assert(/browser/.test(action.description!), action.description);
});
