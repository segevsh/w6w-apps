import { assert, assertEquals, assertRejects } from "@std/assert";
import unsubscribe from "../../actions/person-unsubscribe.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof unsubscribe.execute>[1], input: Record<string, unknown>) =>
  unsubscribe.execute(input as never, ctx) as Promise<unknown>;

Deno.test("person-unsubscribe: declares an idempotent perform action", () => {
  assertEquals(unsubscribe.key, "person-unsubscribe");
  assertEquals(unsubscribe.type, "perform");
  assertEquals(unsubscribe.idempotent, true);
  assert((unsubscribe.description ?? "").length > 0);
  assert(Array.isArray(unsubscribe.output) && unsubscribe.output.length > 0);
});

Deno.test("person-unsubscribe: identifiers travel in the query string, not a body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await run(ctx, { email: "a@x.com", userId: "9" }), { ok: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/people/unsubscribe");
  assertEquals(queryOf(calls[0].url), { email: "a@x.com", userId: "9" });
  assertEquals(calls[0].body, null);
});

Deno.test("person-unsubscribe: needs an identifier; failures are thrown", async () => {
  const none = mockCtx([]);
  await assertRejects(() => run(none.ctx, {}), Error, "at least one of email");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 404, body: errBody("Person not found") }]);
  await assertRejects(() => run(ctx, { id: "x" }), Error, "Person not found");
});
