import { assertEquals, assertRejects } from "@std/assert";
import noteSearch from "../../actions/note-search.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("note-search: GET /v1/search-notes with the documented parameters", async () => {
  const response = { hits: [{ id: "n1", highlight: "" }], nbPages: 3, page: 2 };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await noteSearch.execute({
    query: "q",
    depth: 0,
    reviewState: "Outdated",
    page: 2,
    hitsPerPage: 5,
    includeArchived: false,
    lastEditedAfter: "2026-01-01T00:00:00Z",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/search-notes");
  assertEquals(queryOf(calls[0].url), {
    query: "q",
    depth: "0",
    reviewState: "Outdated",
    page: "2",
    hitsPerPage: "5",
    includeArchived: "false",
    lastEditedAfter: "2026-01-01T00:00:00Z",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("note-search: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () =>
      await noteSearch.execute({
        query: "q",
        depth: 0,
        reviewState: "Outdated",
        page: 2,
        hitsPerPage: 5,
        includeArchived: false,
        lastEditedAfter: "2026-01-01T00:00:00Z",
      }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});
