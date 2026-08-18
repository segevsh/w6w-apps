import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, paged, STATUS } from "./_shared.ts";
import action from "../../actions/account-statuses.ts";

const feed = paged([
  STATUS,
  { ...STATUS, id: "s2", reblog: { id: "other", account: { acct: "someone-else" } } },
]);

Deno.test("account-statuses: reads a feed and returns the paging ids", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  const result = await action.execute!({ id: "a1" }, ctx) as {
    count: number;
    nextMaxId: string;
    nextMinId: string;
  };
  assert(new URL(calls[0].url).pathname.endsWith("/api/v1/accounts/a1/statuses"), calls[0].url);
  assertEquals(result.count, 2);
  assertEquals(result.nextMaxId, "111");
  assertEquals(result.nextMinId, "999");
});

/** A chatty account's feed is mostly replies, so this defaults against the API. */
Deno.test("account-statuses: excludes replies by default", async () => {
  const on = mockCtx([feed], { display });
  await action.execute!({ id: "a1" }, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("exclude_replies"), "true");

  const off = mockCtx([feed], { display });
  await action.execute!({ id: "a1", excludeReplies: false }, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.has("exclude_replies"), false);
});

/** A boost's `account` is the original author's, not the account asked about. */
Deno.test("account-statuses: boosts are counted separately", async () => {
  const { ctx } = mockCtx([feed], { display });
  const result = await action.execute!({ id: "a1" }, ctx) as { boostCount: number };
  assertEquals(result.boostCount, 1);
});

Deno.test("account-statuses: boosts can be excluded at the server", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  await action.execute!({ id: "a1", excludeReblogs: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("exclude_reblogs"), "true");
});

Deno.test("account-statuses: the limit is clamped and the paging ids passed", async () => {
  const { ctx, calls } = mockCtx([feed], { display });
  await action.execute!({ id: "a1", limit: 500, maxId: "50", minId: "10" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "40");
  assertEquals(url.searchParams.get("max_id"), "50");
  assertEquals(url.searchParams.get("min_id"), "10");
});

Deno.test("account-statuses: needs an account id", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
});

Deno.test("account-statuses: logs counts, never the posts", async () => {
  const { ctx, logs } = mockCtx([feed], { display });
  await action.execute!({ id: "a1" }, ctx);
  assert(!JSON.stringify(logs).includes("hello"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 2, boostCount: 1 });
});

/** For a remote account this is a cache, not their history. */
Deno.test("account-statuses: says what a remote account's feed actually is", () => {
  assert(/not their history/.test(action.description!), action.description);
});
