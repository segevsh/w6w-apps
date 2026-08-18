import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok, STATUS } from "./_shared.ts";
import action from "../../actions/status-search.ts";

const results = ok({
  statuses: [STATUS],
  accounts: [{ acct: "alice" }, { acct: "bob@other.social" }],
  hashtags: [{ name: "tag" }],
});

Deno.test("status-search: searches and strips the statuses' HTML", async () => {
  const { ctx, calls } = mockCtx([results], { display });
  const result = await action.execute!({ q: "deno" }, ctx) as {
    count: number;
    texts: string[];
  };
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/search");
  assertEquals(result.count, 4);
  assertEquals(result.texts, ["hello #tag"]);
});

/** Resolving is what pulls an unseen remote object in. */
Deno.test("status-search: resolve is on by default and can be turned off", async () => {
  const on = mockCtx([results], { display });
  await action.execute!({ q: "https://other.social/@bob/1" }, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("resolve"), "true");

  const off = mockCtx([results], { display });
  await action.execute!({ q: "deno", resolve: false }, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.has("resolve"), false);
});

Deno.test("status-search: the type filter and limit reach the wire", async () => {
  const { ctx, calls } = mockCtx([results], { display });
  await action.execute!({ q: "deno", type: "accounts", limit: 99 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("type"), "accounts");
  assertEquals(url.searchParams.get("limit"), "40", "clamped to Mastodon's ceiling");
});

Deno.test("status-search: needs a query", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`q` is required");
  assertEquals(calls.length, 0);
});

/** The query is the caller's and the results are other people's posts. */
Deno.test("status-search: logs counts, never the query or results", async () => {
  const { ctx, logs } = mockCtx([results], { display });
  await action.execute!({ q: "something private" }, ctx);
  assert(!JSON.stringify(logs).includes("private"), JSON.stringify(logs));
  assertEquals(logs[0].data, { statuses: 1, accounts: 2, hashtags: 1 });
});

/** There is no global index, and absence proves nothing. */
Deno.test("status-search: says it searches this instance's view, not the network", () => {
  assert(/which is not the network/.test(action.description!), action.description);
});
