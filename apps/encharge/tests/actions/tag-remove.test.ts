import { assert, assertEquals, assertRejects } from "@std/assert";
import tag from "../../actions/tag-remove.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof tag.execute>[1], input: Record<string, unknown>) =>
  tag.execute(input as never, ctx) as Promise<unknown>;

Deno.test("tag-remove: declares an idempotent perform action", () => {
  assertEquals(tag.key, "tag-remove");
  assertEquals(tag.type, "perform");
  assertEquals(tag.idempotent, true);
  assert((tag.description ?? "").length > 0);
  assert(Array.isArray(tag.output) && tag.output.length > 0);
});

Deno.test("tag-remove: sends DELETE /tags with the tag and person in a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await run(ctx, { email: "a@x.com", tag: " customer,beta " }), { ok: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/tags");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { tag: "customer,beta", email: "a@x.com" });
});

Deno.test("tag-remove: needs a tag and a person; failures are thrown", async () => {
  const none = mockCtx([]);
  await assertRejects(() => run(none.ctx, { email: "a@x.com", tag: " " }), Error, "tag");
  await assertRejects(() => run(none.ctx, { tag: "x" }), Error, "at least one of email");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 404, body: errBody("No such person") }]);
  await assertRejects(() => run(ctx, { userId: "1", tag: "x" }), Error, "No such person");
});
