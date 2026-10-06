import { assert, assertEquals, assertRejects } from "@std/assert";
import archive from "../../actions/people-archive.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof archive.execute>[1], input: Record<string, unknown>) =>
  archive.execute(input as never, ctx) as Promise<unknown>;

Deno.test("people-archive: declares an idempotent perform action", () => {
  assertEquals(archive.key, "people-archive");
  assertEquals(archive.type, "perform");
  assertEquals(archive.idempotent, true);
  assert((archive.description ?? "").length > 0);
  assert(Array.isArray(archive.output) && archive.output.length > 0);
});

Deno.test("people-archive: archives by default (no force) and returns ok on a 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await run(ctx, { email: "a@x.com" }), { ok: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/people");
  assertEquals(queryOf(calls[0].url), { "people[0][email]": "a@x.com" });
  assertEquals(calls[0].body, null);
});

Deno.test("people-archive: force=true is sent only when asked for", async () => {
  const on = mockCtx([{ status: 204 }]);
  await run(on.ctx, { userId: "7", force: true });
  assertEquals(queryOf(on.calls[0].url), { "people[0][userId]": "7", force: "true" });
  const off = mockCtx([{ status: 204 }]);
  await run(off.ctx, { userId: "7", force: false });
  assertEquals(queryOf(off.calls[0].url), { "people[0][userId]": "7" });
});

Deno.test("people-archive: no identifier fails before a request; failures are thrown", async () => {
  const none = mockCtx([]);
  await assertRejects(() => run(none.ctx, {}), Error, "at least one of email");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 403, body: errBody("Not allowed") }]);
  await assertRejects(() => run(ctx, { email: "a@x.com" }), Error, "Not allowed");
});
