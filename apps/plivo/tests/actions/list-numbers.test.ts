import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-numbers.ts";

Deno.test("list-numbers: sends only the filters that were set, under the documented names", async () => {
  const body = {
    api_id: "a",
    meta: { limit: 5, offset: 0, total_count: 0, next: null },
    objects: [],
  };
  const { ctx, calls } = mockCtx([{ body }], CONN);
  const out = await action.execute!({
    type: "local",
    numberStartsWith: "1415",
    alias: "Main",
    services: "voice,sms",
    subaccount: "SA1",
    renewalDate: "2026-11-01",
    limit: 2,
    offset: 4,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, BASE + "Number/");
  assertEquals(Object.fromEntries(u.searchParams), {
    type: "local",
    number_startswith: "1415",
    alias: "Main",
    services: "voice,sms",
    subaccount: "SA1",
    renewal_date: "2026-11-01",
    limit: "2",
    offset: "4",
  });
  assertEquals(out, body);
});

Deno.test("list-numbers: no input means no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { objects: [] } }], CONN);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, BASE + "Number/");
});

Deno.test("list-numbers: a 401 plain-text body is thrown with its text", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Could not verify your access level" }], CONN);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "Could not verify your access level",
  );
});
