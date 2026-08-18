import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/status-context.ts";

const thread = ok({
  ancestors: [{ content: "<p>first</p>", account: { acct: "alice" } }],
  descendants: [
    { content: "<p>reply</p>", account: { acct: "bob@other.social" } },
    { content: "<p>another</p>", account: { acct: "alice" } },
  ],
});

/** Two flat arrays, not a tree. */
Deno.test("status-context: returns ancestors and descendants separately", async () => {
  const { ctx, calls } = mockCtx([thread], { display });
  const result = await action.execute!({ id: "s1" }, ctx) as {
    ancestors: unknown[];
    descendants: unknown[];
    count: number;
    texts: string[];
    participants: string[];
  };
  assertEquals(calls[0].url, "https://mastodon.social/api/v1/statuses/s1/context");
  assertEquals(result.ancestors.length, 1);
  assertEquals(result.descendants.length, 2);
  assertEquals(result.count, 3);
  assertEquals(result.texts, ["first", "reply", "another"]);
  assertEquals(result.participants.sort(), ["alice", "bob@other.social"]);
});

Deno.test("status-context: a thread with nothing around it is a count of zero", async () => {
  const { ctx } = mockCtx([ok({ ancestors: [], descendants: [] })], { display });
  const result = await action.execute!({ id: "s1" }, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("status-context: needs an id", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
});

Deno.test("status-context: logs counts, never the posts", async () => {
  const { ctx, logs } = mockCtx([thread], { display });
  await action.execute!({ id: "s1" }, ctx);
  assert(!JSON.stringify(logs).includes("reply"), JSON.stringify(logs));
  assertEquals(logs[0].data, { ancestors: 1, descendants: 2 });
});

/** A conversation can look one-sided here and complete elsewhere. */
Deno.test("status-context: says the thread is only this instance's copy", () => {
  assert(/simply absent, with nothing to say so/.test(action.description!), action.description);
});
