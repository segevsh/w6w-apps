import { assert, assertEquals, assertRejects } from "@std/assert";
import activityList from "../../actions/activity-list.ts";
import { API_ROOT, listEnvelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("activity-list: GETs /activities with paging, sort and filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }, { id: 2 }], 42) }]);
  const out = await activityList.execute({
    "limit": 50,
    "offset": 10,
    "sort": "id",
    "filter": { "user.id": "ne:1" },
  }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/activities?`), true);
  assertEquals(queryOf(calls[0].url), {
    "limit": "50",
    "offset": "10",
    "sort": "id",
    "user.id": "ne:1",
  });
  assertEquals(out, { data: [{ id: 1 }, { id: 2 }], total: 42, limit: 1000, offset: 0 });
});

Deno.test("activity-list: with no inputs it sends no query and never a token", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await activityList.execute({}, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/activities`);
  assert(!calls[0].url.includes("token"));
});

Deno.test("activity-list: a caller-supplied token filter key is dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await activityList.execute({ filter: { token: "x", id: "gt:5" } }, ctx);
  assertEquals(queryOf(calls[0].url), { id: "gt:5" });
});

Deno.test("activity-list: a filter given as a JSON string is parsed", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await activityList.execute({ filter: '{"id":"gt:5"}' }, ctx);
  assertEquals(queryOf(calls[0].url), { id: "gt:5" });
});

Deno.test("activity-list: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(async () => await activityList.execute({}, ctx), Error, "401");
});

Deno.test("activity-list: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(async () => await activityList.execute({}, ctx), Error, "ThrottleLimit");
});
