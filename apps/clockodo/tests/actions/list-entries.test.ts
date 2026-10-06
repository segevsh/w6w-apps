import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-entries.ts";
import { API_ROOT, exec, mockCtx } from "../_helpers.ts";

Deno.test("list-entries: GETs /v2/entries with deepObject filters and paging", async () => {
  const resp = { paging: { current_page: 2, count_items: 5 }, entries: [{ id: 1 }] };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const out = await exec(action, {
    timeSince: "2026-10-01T00:00:00Z",
    timeUntil: "2026-10-31T23:59:59Z",
    usersId: 7,
    text: "x y",
    enhancedList: true,
    page: 2,
    itemsPerPage: 50,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API_ROOT}/v2/entries`);
  assertEquals(url.searchParams.get("time_since"), "2026-10-01T00:00:00Z");
  assertEquals(url.searchParams.get("filter[users_id]"), "7");
  assertEquals(url.searchParams.get("filter[text]"), "x y");
  assertEquals(url.searchParams.get("enhanced_list"), "true");
  assertEquals(url.searchParams.get("items_per_page"), "50");
  assertEquals(url.searchParams.get("filter[customers_id]"), null);
  assertEquals(out, resp);
});

Deno.test("list-entries: the window is required and never reaches the API without it", async () => {
  const none = mockCtx();
  await assertRejects(
    () => exec(action, { timeSince: "2026-10-01T00:00:00Z" }, none.ctx),
    Error,
    "timeUntil",
  );
  assertEquals(none.calls.length, 0);
});

Deno.test("list-entries: a non-array entries member becomes an empty list; errors surface", async () => {
  const a = mockCtx([{ body: {} }]);
  assertEquals((await exec(action, { timeSince: "a", timeUntil: "b" }, a.ctx)).entries, []);
  const b = mockCtx([{
    status: 400,
    body: { errors: [{ type: "General", message: "bad window", path: "time_since" }] },
  }]);
  await assertRejects(
    () => exec(action, { timeSince: "a", timeUntil: "b" }, b.ctx),
    Error,
    "bad window (time_since)",
  );
});
