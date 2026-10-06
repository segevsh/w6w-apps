import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-recordings.ts";

Deno.test("list-recordings: sends only the filters that were set, under the documented names", async () => {
  const body = {
    api_id: "a",
    meta: { limit: 5, offset: 0, total_count: 0, next: null },
    objects: [],
  };
  const { ctx, calls } = mockCtx([{ body }], CONN);
  const out = await action.execute!({
    callUuid: "c",
    fromNumber: "1",
    toNumber: "2",
    addedAfter: "2026-10-01",
    addedBefore: "2026-10-02",
    limit: 3,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, BASE + "Recording/");
  assertEquals(Object.fromEntries(u.searchParams), {
    call_uuid: "c",
    from_number: "1",
    to_number: "2",
    add_time__gte: "2026-10-01",
    add_time__lte: "2026-10-02",
    limit: "3",
  });
  assertEquals(out, body);
});

Deno.test("list-recordings: no input means no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { objects: [] } }], CONN);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, BASE + "Recording/");
});

Deno.test("list-recordings: a 401 plain-text body is thrown with its text", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Could not verify your access level" }], CONN);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "Could not verify your access level",
  );
});
