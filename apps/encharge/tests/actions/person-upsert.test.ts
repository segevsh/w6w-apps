import { assert, assertEquals, assertRejects } from "@std/assert";
import personUpsert from "../../actions/person-upsert.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof personUpsert.execute>[1], input: Record<string, unknown>) =>
  personUpsert.execute(input as never, ctx) as Promise<unknown>;

Deno.test("person-upsert: declares an idempotent perform action", () => {
  assertEquals(personUpsert.key, "person-upsert");
  assertEquals(personUpsert.type, "perform");
  assertEquals(personUpsert.idempotent, true);
  assert((personUpsert.description ?? "").length > 0);
  assert(Array.isArray(personUpsert.output) && personUpsert.output.length > 0);
});

Deno.test("person-upsert: POSTs a one-element array; identifiers win over custom fields", async () => {
  const reply = { users: [{ id: "u1", email: "a@x.com" }] };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await run(ctx, {
    email: "a@x.com",
    firstName: "Ada",
    fields: '{"plan":"pro","email":"ignored@x.com"}',
  });
  assertEquals(out, reply);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/people");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), [{ plan: "pro", email: "a@x.com", firstName: "Ada" }]);
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("person-upsert: needs an identifier and an object for fields", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => run(ctx, { firstName: "Ada" }), Error, "at least one of email");
  await assertRejects(() => run(ctx, { email: "a@x.com", fields: "[1]" }), Error, "JSON object");
  assertEquals(calls.length, 0);
});

Deno.test("person-upsert: an Encharge failure is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errBody("Invalid field plan") }]);
  await assertRejects(() => run(ctx, { email: "a@x.com" }), Error, "Invalid field plan");
});
