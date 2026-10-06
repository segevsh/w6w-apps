import { assertEquals, assertRejects } from "@std/assert";
import namedListGet from "../../actions/named-list-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("named-list-get: GETs one list by escaped name", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "job title", items: [] } }]);
  await namedListGet.execute({ listName: "job title", includeArchived: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/company/named-lists/job%20title");
  assertEquals(queryOf(calls[0].url), { includeArchived: "true" });
});

Deno.test("named-list-get: requires a list name", async () => {
  const { ctx } = mockCtx();
  await assertRejects(() => Promise.resolve(namedListGet.execute({ listName: " " }, ctx)));
});
