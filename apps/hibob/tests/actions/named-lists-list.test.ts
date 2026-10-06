import { assertEquals } from "@std/assert";
import namedListsList from "../../actions/named-lists-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("named-lists-list: GETs /v1/company/named-lists, archived only on request", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ name: "site", items: [] }] }, { body: [] }]);
  const out = await namedListsList.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/v1/company/named-lists");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.count, 1);
  await namedListsList.execute({ includeArchived: true }, ctx);
  assertEquals(queryOf(calls[1].url), { includeArchived: "true" });
});
