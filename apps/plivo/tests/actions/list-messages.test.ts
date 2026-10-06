import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-messages.ts";

Deno.test("list-messages: sends only the filters that were set, under the documented names", async () => {
  const body = {
    api_id: "a",
    meta: { limit: 5, offset: 0, total_count: 0, next: null },
    objects: [],
  };
  const { ctx, calls } = mockCtx([{ body }], CONN);
  const out = await action.execute!({
    direction: "outbound",
    state: "delivered",
    type: "sms",
    after: "2026-10-01 00:00:00",
    before: "2026-10-02 00:00:00",
    errorCode: 0,
    powerpackId: "pp",
    limit: 5,
    offset: 10,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, BASE + "Message/");
  assertEquals(Object.fromEntries(u.searchParams), {
    message_direction: "outbound",
    message_state: "delivered",
    message_type: "sms",
    message_time__gt: "2026-10-01 00:00:00",
    message_time__lt: "2026-10-02 00:00:00",
    error_code: "0",
    powerpack_id: "pp",
    limit: "5",
    offset: "10",
  });
  assertEquals(out, body);
});

Deno.test("list-messages: no input means no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { objects: [] } }], CONN);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, BASE + "Message/");
});

Deno.test("list-messages: a 401 plain-text body is thrown with its text", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Could not verify your access level" }], CONN);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "Could not verify your access level",
  );
});
