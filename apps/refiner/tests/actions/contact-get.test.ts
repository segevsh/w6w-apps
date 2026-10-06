import { assert, assertEquals, assertRejects } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-get: GETs /v1/contact by user id", async () => {
  const body = { uuid: "c1", remote_id: "u1", attributes: {}, segments: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await contactGet.execute({ id: "u1" }, ctx), body);
  assertEquals(pathOf(calls[0].url), "/v1/contact");
  assertEquals(queryOf(calls[0].url), { id: "u1" });
});

Deno.test("contact-get: can look up by email or uuid, trimming whitespace", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await contactGet.execute({ email: " a@b.co " }, ctx);
  await contactGet.execute({ uuid: "c1" }, ctx);
  assertEquals(queryOf(calls[0].url), { email: "a@b.co" });
  assertEquals(queryOf(calls[1].url), { uuid: "c1" });
});

Deno.test("contact-get: needs at least one identifier", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => Promise.resolve(contactGet.execute({}, ctx)), Error, "provide one of");
  assertEquals(calls.length, 0);
});

Deno.test("contact-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(contactGet.execute({ id: "u1" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
