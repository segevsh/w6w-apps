import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/profile-search.ts";

const hits = ok({ actors: [{ did: "did:plc:a", handle: "a.bsky.social" }], cursor: "c1" });

Deno.test("profile-search: uses the paging search, not the typeahead", async () => {
  const { ctx, calls } = mockCtx([hits], { display });
  const result = await action.execute!({ q: "alice" }, ctx) as { count: number; cursor: string };
  assert(calls[0].url.includes("app.bsky.actor.searchActors"), calls[0].url);
  assert(!calls[0].url.includes("Typeahead"), calls[0].url);
  assertEquals(result.count, 1);
  assertEquals(result.cursor, "c1");
});

Deno.test("profile-search: the limit is clamped", async () => {
  const { ctx, calls } = mockCtx([hits], { display });
  await action.execute!({ q: "alice", limit: 999 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
});

Deno.test("profile-search: the cursor is passed for the next page", async () => {
  const { ctx, calls } = mockCtx([hits], { display });
  await action.execute!({ q: "alice", cursor: "c0" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("cursor"), "c0");
});

Deno.test("profile-search: no matches is an empty list, not an error", async () => {
  const { ctx } = mockCtx([ok({ actors: [] })], { display });
  const result = await action.execute!({ q: "nobody" }, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("profile-search: needs a query", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`q` is required");
  assertEquals(calls.length, 0);
});

/** Only a custom-domain handle carries an identity claim. */
Deno.test("profile-search: warns that a display name proves nothing", () => {
  assert(/free text/.test(action.description!), action.description);
});
