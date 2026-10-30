import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("contact-get: fetches by jnid and returns the record unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "a1", first_name: "Bruce" } }]);
  const out = await contactGet.execute({ jnid: "a1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/contacts/a1");
  assertEquals(out, { jnid: "a1", first_name: "Bruce" });
});

test("contact-get: passes actor through as a query param when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "a1" } }]);
  await contactGet.execute({ jnid: "a1", actor: "sam@company.com" }, ctx);
  assertEquals(queryOf(calls[0].url), { actor: "sam@company.com" });
});

test("contact-get: omits actor when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "a1" } }]);
  await contactGet.execute({ jnid: "a1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

test("contact-get: jnid is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactGet.execute({ jnid: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api1/contacts/a%2Fb");
});
