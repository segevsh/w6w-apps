import { assertEquals, assertRejects } from "@std/assert";
import userSearch from "../../actions/user-search.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("user-search: GET /v1/users with the documented parameters", async () => {
  const response = { users: [{ id: "u1" }], total: 1, hasNextPage: false, nextCursor: null };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await userSearch.execute(
    { query: " jane ", includeArchived: true, cursor: "c" },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(queryOf(calls[0].url), { query: "jane", includeArchived: "true", cursor: "c" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("user-search: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () =>
      await userSearch.execute({ query: " jane ", includeArchived: true, cursor: "c" }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("user-search: a blank query is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await userSearch.execute({ query: " " }, ctx), Error, "query");
  assertEquals(calls.length, 0);
});
