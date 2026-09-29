import { assertEquals } from "@std/assert";
import listsList from "../../actions/lists-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lists-list: reads /v2/lists/ and takes no params", async () => {
  const results = [{
    id: "lst_abcdef",
    createdAt: 1620687647,
    status: "Ready",
    totalCredits: 1000,
  }];
  const { ctx, calls } = mockCtx([{ body: results }]);
  const out = await listsList.execute({}, ctx) as { results: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/lists/");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.results, results);
  assertEquals(listsList.params?.length, 0);
});

Deno.test("lists-list: an empty body is reported as an empty results array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const out = await listsList.execute({}, ctx) as { results: unknown[] };
  assertEquals(out.results, []);
});
