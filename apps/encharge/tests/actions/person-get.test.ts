import { assert, assertEquals, assertRejects } from "@std/assert";
import personGet from "../../actions/person-get.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof personGet.execute>[1], input: Record<string, unknown>) =>
  personGet.execute(input as never, ctx) as Promise<unknown>;

Deno.test("person-get: declares a read action with params and output", () => {
  assertEquals(personGet.key, "person-get");
  assertEquals(personGet.type, "read");
  assert((personGet.description ?? "").length > 0);
  assert(Array.isArray(personGet.output) && personGet.output.length > 0);
  assertEquals(personGet.idempotent, undefined);
});

Deno.test("person-get: one email becomes people[0][email] and the users list is returned", async () => {
  const body = { users: [{ id: "u1", email: "a@x.com" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await run(ctx, { email: "a@x.com" }), body);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/people");
  assert(calls[0].url.startsWith("https://api.encharge.io/v1/people?"));
  assertEquals(queryOf(calls[0].url), { "people[0][email]": "a@x.com" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["x-encharge-token"], undefined);
});

Deno.test("person-get: a people array selects several people by any identifier", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [] } }]);
  await run(ctx, { people: '[{"userId":"abc"},{"email":"b@x.com","id":"i2"}]' });
  assertEquals(queryOf(calls[0].url), {
    "people[0][userId]": "abc",
    "people[1][id]": "i2",
    "people[1][email]": "b@x.com",
  });
});

Deno.test("person-get: no identifier fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => run(ctx, {}), Error, "at least one of email");
  await assertRejects(() => run(ctx, { people: "[]" }), Error, "non-empty");
  assertEquals(calls.length, 0);
});

Deno.test("person-get: an Encharge error envelope is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Token without payload", 10082) }]);
  await assertRejects(() => run(ctx, { email: "a@x.com" }), Error, "Token without payload");
});
