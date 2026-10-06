import { assert, assertEquals, assertRejects } from "@std/assert";
import contactIdentify from "../../actions/contact-identify.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-identify: POSTs flat traits beside the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { message: "ok", contact_uuid: "c1" } }]);
  const out = await contactIdentify.execute(
    { id: "u1", email: "a@b.co", traits: { plan: "pro", seats: 3, created_at: "2026-01-02" } },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/identify-user");
  assertEquals(JSON.parse(calls[0].body!), {
    plan: "pro",
    seats: 3,
    created_at: "2026-01-02",
    id: "u1",
    email: "a@b.co",
  });
  assertEquals(out, { message: "ok", contact_uuid: "c1" });
});

Deno.test("contact-identify: traits given as a JSON string are parsed; id cannot be overridden", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await contactIdentify.execute({ id: "u1", traits: '{"id":"evil","plan":"pro"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: "u1", plan: "pro" });
});

Deno.test("contact-identify: nests the account object", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await contactIdentify.execute({ email: "a@b.co", account: { id: "acme", name: "Acme" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).account, { id: "acme", name: "Acme" });
});

Deno.test("contact-identify: rejects missing identity, bad JSON and an account without id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(contactIdentify.execute({}, ctx)),
    Error,
    "user id or an email",
  );
  await assertRejects(
    () => Promise.resolve(contactIdentify.execute({ id: "u1", traits: "{nope" }, ctx)),
    Error,
    "traits is not valid JSON",
  );
  await assertRejects(
    () => Promise.resolve(contactIdentify.execute({ id: "u1", account: { name: "x" } }, ctx)),
    Error,
    "account.id",
  );
  await assertRejects(
    () => Promise.resolve(contactIdentify.execute({ id: "u1", traits: "[1]" }, ctx)),
    Error,
    "must be a JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-identify: is idempotent", () => assertEquals(contactIdentify.idempotent, true));

Deno.test("contact-identify: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(contactIdentify.execute({ id: "u1" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
