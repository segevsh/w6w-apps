import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-subscribers.ts";

Deno.test("list-subscribers: GETs /api/subscribers with the default limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], links: {}, meta: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/subscribers");
  assertEquals(url.searchParams.get("limit"), "25");
});

Deno.test("list-subscribers: forwards the status filter and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ status: "active", limit: 50, cursor: "eyJpZCI6MX0" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("filter[status]"), "active");
  assertEquals(params.get("limit"), "50");
  assertEquals(params.get("cursor"), "eyJpZCI6MX0");
});

Deno.test("list-subscribers: `include` is only sent when groups are requested", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }, { body: { data: [] } }]);
  await action.execute!({ includeGroups: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("include"), "groups");
  await action.execute!({ includeGroups: false }, ctx);
  assert(!new URL(calls[1].url).searchParams.has("include"));
});

Deno.test("list-subscribers: omits status and cursor when not provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("filter[status]"));
  assert(!params.has("cursor"));
});

Deno.test("list-subscribers: returns the envelope so the caller can paginate", async () => {
  const envelope = { data: [{ id: "1" }], links: {}, meta: { next_cursor: "abc" } };
  const { ctx } = mockCtx([{ body: envelope }]);
  assertEquals(await action.execute!({}, ctx), envelope);
});
