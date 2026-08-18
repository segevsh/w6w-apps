import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/password-change-ticket.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };
const ok = { status: 201, body: { ticket: "https://acme.us.auth0.com/lo/reset?ticket=abc" } };

Deno.test("password-change-ticket: mints a ticket for an existing user", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ userId: "auth0|1", ttlSeconds: 900 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/tickets/password-change");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.user_id, "auth0|1");
  assertEquals(sent.ttl_sec, 900);
});

/** With an email and a connection it works for somebody who does not exist. */
Deno.test("password-change-ticket: an email needs a connection", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ email: "ada@example.com" }, ctx),
    Error,
    "connection",
  );
  assertEquals(calls.length, 0);
});

Deno.test("password-change-ticket: an id and an email together are refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ userId: "auth0|1", email: "a@b.test" }, ctx),
    Error,
    "not both",
  );
});

/** The response URL is a bearer credential for that account. */
Deno.test("password-change-ticket: the output labels the ticket as a secret", () => {
  const field = (action.output as Array<{ key: string; label: string }>)
    .find((o) => o.key === "ticket")!;
  assert(/secret/i.test(field.label), field.label);
});

Deno.test("password-change-ticket: never logs the ticket itself", async () => {
  const { ctx, logs } = mockCtx([ok], conn);
  await action.execute!({ userId: "auth0|1" }, ctx);
  assert(!JSON.stringify(logs).includes("ticket=abc"), JSON.stringify(logs));
});
