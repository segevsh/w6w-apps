import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/link-bulk-create.ts";
import { mockCtx } from "../_helpers.ts";

const ok = { id: "link_1", url: "https://a.com" };
const failed = {
  link: { url: "nope" },
  error: "Invalid URL",
  code: "unprocessable_entity",
};

Deno.test("link-bulk-create: POSTs the array as the body and splits links from errors", async () => {
  const { ctx, calls } = mockCtx([{ body: [ok, failed] }]);
  const out = await action.execute!({
    links: '[{"url":"https://a.com"},{"url":"nope"}]',
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/links/bulk");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), [{ url: "https://a.com" }, { url: "nope" }]);
  assertEquals(out, { links: [ok], errors: [failed] });
});

Deno.test("link-bulk-create: accepts an already-parsed array", async () => {
  const { ctx, calls } = mockCtx([{ body: [ok] }]);
  await action.execute!({ links: [{ url: "https://a.com" }] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), [{ url: "https://a.com" }]);
});

Deno.test("link-bulk-create: rejects empty, non-array and >100 input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ links: "[]" }, ctx), Error, "non-empty");
  await assertRejects(
    async () => await action.execute!({ links: '{"url":"x"}' }, ctx),
    Error,
    "non-empty",
  );
  const tooMany = Array.from({ length: 101 }, () => ({ url: "https://a.com" }));
  await assertRejects(
    async () => await action.execute!({ links: tooMany }, ctx),
    Error,
    "at most 100",
  );
  assertEquals(calls.length, 0);
});

Deno.test("link-bulk-create: sends no authorization header and is not idempotent", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({ links: [{ url: "https://a.com" }] }, ctx);
  assert(!("authorization" in calls[0].headers));
  assertEquals(action.idempotent, false);
});
