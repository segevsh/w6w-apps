import { assertEquals, assertRejects } from "@std/assert";
import groupSearch from "../../actions/group-search.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("group-search: GET /v1/groups with the documented parameters", async () => {
  const response = { groups: [{ id: "g1" }], total: 1, hasNextPage: false, nextCursor: null };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await groupSearch.execute({ query: "eng", cursor: "c" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/groups");
  assertEquals(queryOf(calls[0].url), { query: "eng", cursor: "c" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("group-search: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await groupSearch.execute({ query: "eng", cursor: "c" }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("group-search: a blank query is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await groupSearch.execute({ query: "" }, ctx), Error, "query");
  assertEquals(calls.length, 0);
});
