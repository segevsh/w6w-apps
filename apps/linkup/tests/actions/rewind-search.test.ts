import { assertEquals, assertRejects } from "@std/assert";
import rewindSearch from "../../actions/rewind-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("rewind-search: validates the date before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await rewindSearch.execute({ q: "q", asOf: "June 30" }, ctx),
    Error,
    "YYYY-MM-DD",
  );
  await assertRejects(
    async () => await rewindSearch.execute({ q: "", asOf: "2025-06-30" }, ctx),
    Error,
    "Query",
  );
  assertEquals(calls.length, 0);
});
