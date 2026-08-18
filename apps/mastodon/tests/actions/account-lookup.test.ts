import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/account-lookup.ts";

const remote = ok({
  id: "a1",
  acct: "bob@other.social",
  url: "https://other.social/@bob",
  note: "<p>a bio</p>",
  followers_count: 10,
  following_count: 20,
  statuses_count: 30,
});

Deno.test("account-lookup: resolves a handle and strips the bio's HTML", async () => {
  const { ctx, calls } = mockCtx([remote], { display });
  const result = await action.execute!({ acct: "@bob@other.social" }, ctx) as {
    acct: string;
    note: string;
    counts: { followers: number };
  };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/accounts/lookup");
  assertEquals(url.searchParams.get("acct"), "bob@other.social", "the leading @ is stripped");
  assertEquals(result.acct, "bob@other.social");
  assertEquals(result.note, "a bio");
  assertEquals(result.counts.followers, 10);
});

/**
 * Mastodon returns a bare `acct` for a local account and `user@domain` for a
 * remote one — the only signal of which it is.
 */
Deno.test("account-lookup: local and remote are distinguished by the acct's shape", async () => {
  const localCtx = mockCtx([ok({ id: "a2", acct: "alice" })], { display });
  const local = await action.execute!({ acct: "alice" }, localCtx.ctx) as { local: boolean };
  assertEquals(local.local, true);

  const remoteCtx = mockCtx([remote], { display });
  const away = await action.execute!({ acct: "bob@other.social" }, remoteCtx.ctx) as {
    local: boolean;
  };
  assertEquals(away.local, false);
});

Deno.test("account-lookup: missing counts read as zero", async () => {
  const { ctx } = mockCtx([ok({ id: "a1", acct: "alice" })], { display });
  const result = await action.execute!({ acct: "alice" }, ctx) as {
    counts: { followers: number; statuses: number };
  };
  assertEquals(result.counts, { followers: 0, following: 0, statuses: 0 } as unknown);
});

Deno.test("account-lookup: needs a handle", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`acct` is required");
  assertEquals(calls.length, 0);
});

/** Across the fediverse the same name usually exists on several servers. */
Deno.test("account-lookup: warns that a bare name means a local account", () => {
  assert(/means a LOCAL account/.test(action.description!), action.description);
});
