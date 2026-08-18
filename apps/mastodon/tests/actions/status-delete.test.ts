import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/status-delete.ts";

/** Mastodon returns the source text so a client can offer delete-and-redraft. */
Deno.test("status-delete: returns what the post said, which is the only recovery", async () => {
  const { ctx, calls } = mockCtx([ok({ text: "the original source" })], { display });
  const result = await action.execute!({ id: "s1" }, ctx) as { deleted: boolean; text: string };
  assertEquals(calls[0].url, "https://mastodon.social/api/v1/statuses/s1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result.deleted, true);
  assertEquals(result.text, "the original source");
});

Deno.test("status-delete: falls back to stripping the HTML when there is no source", async () => {
  const { ctx } = mockCtx([ok({ content: "<p>rendered only</p>" })], { display });
  const result = await action.execute!({ id: "s1" }, ctx) as { text: string };
  assertEquals(result.text, "rendered only");
});

Deno.test("status-delete: needs an id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
  assertEquals(calls.length, 0);
});

/** The post itself is the caller's content. */
Deno.test("status-delete: logs the id, never the text", async () => {
  const { ctx, logs } = mockCtx([ok({ text: "a secret about tuna" })], { display });
  await action.execute!({ id: "s1" }, ctx);
  assert(!JSON.stringify(logs).includes("tuna"), JSON.stringify(logs));
  assertEquals(logs[0].data, { id: "s1" });
});

/** On a federated network a delete is a broadcast, not a transaction. */
Deno.test("status-delete: says other instances are sent a delete, not made to obey", () => {
  assert(/expected to honour it/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
