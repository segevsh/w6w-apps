import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok, STATUS } from "./_shared.ts";
import action from "../../actions/status-get.ts";

/** `content` is HTML, and a workflow matching on it gets markup. */
Deno.test("status-get: returns the stripped text alongside the raw status", async () => {
  const { ctx, calls } = mockCtx([ok(STATUS)], { display });
  const result = await action.execute!({ id: "s1" }, ctx) as {
    text: string;
    uri: string;
    author: string;
    counts: { replies: number; boosts: number; favourites: number };
  };
  assertEquals(calls[0].url, "https://mastodon.social/api/v1/statuses/s1");
  assertEquals(result.text, "hello #tag");
  assertEquals(result.author, "alice");
  assertEquals(result.counts, { replies: 2, boosts: 3, favourites: 4 });
});

/** The id is local; the uri is the federated identity. */
Deno.test("status-get: the federated uri comes back separately from the local id", async () => {
  const { ctx } = mockCtx([ok(STATUS)], { display });
  const result = await action.execute!({ id: "s1" }, ctx) as { uri: string; url: string };
  assertEquals(result.uri, "https://mastodon.social/users/alice/statuses/s1");
  assertEquals(result.url, "https://mastodon.social/@alice/s1");
});

Deno.test("status-get: missing counts read as zero, not undefined", async () => {
  const { ctx } = mockCtx([ok({ id: "s1" })], { display });
  const result = await action.execute!({ id: "s1" }, ctx) as {
    counts: { replies: number };
  };
  assertEquals(result.counts.replies, 0);
});

Deno.test("status-get: needs an id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
  assertEquals(calls.length, 0);
});

Deno.test("status-get: says ids are local and uri is not", () => {
  assert(/id is local to this instance/.test(action.description!), action.description);
});
