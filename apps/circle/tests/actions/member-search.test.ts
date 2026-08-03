import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/member-search.ts";

Deno.test("member-search: GETs the dedicated /community_members/search route", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3 } }]);
  await action.execute({ email: "alice@example.com" }, ctx);
  assertEquals(pathOf(calls[0]), "/api/admin/v2/community_members/search");
  assertEquals(queryOf(calls[0]).email, ["alice@example.com"]);
});

Deno.test("member-search: an address with a plus tag is encoded, not lost", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ email: "a+tag@example.com" }, ctx);
  // `+` must survive as data — decoded back it is still the address given.
  assertEquals(queryOf(calls[0]).email, ["a+tag@example.com"]);
});

Deno.test("member-search: a 404 raises rather than resolving to an empty object", async () => {
  // "Not found" and "the call failed" are different outcomes; collapsing the
  // first into a null would make a broken parse indistinguishable from absence.
  const { ctx } = mockCtx([{ status: 404, body: { success: false, message: "Not found" } }]);
  await assertRejects(
    () => Promise.resolve(action.execute({ email: "nobody@example.com" }, ctx)),
    Error,
    "404",
  );
});

Deno.test("member-search: is a read of one record, not a paginated search", () => {
  assertEquals(action.type, "read");
});
