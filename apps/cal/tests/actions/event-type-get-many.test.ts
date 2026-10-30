import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-type-get-many.ts";

test("event-type-get-many: GETs /event-types with cal-api-version 2024-06-14", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/event-types");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["cal-api-version"], "2024-06-14");
});

test("event-type-get-many: maps username and orgSlug", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ username: "jdoe", orgSlug: "acme" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("username"), "jdoe");
  assertEquals(url.searchParams.get("orgSlug"), "acme");
});

test("event-type-get-many: joins usernames with a comma", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ usernames: ["alice", "bob"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("usernames"), "alice,bob");
});
