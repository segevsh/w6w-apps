import { assert, assertEquals } from "@std/assert";
import { mockCtx, param, run } from "../_helpers.ts";
import listSmartLists from "../../actions/list-smart-lists.ts";

Deno.test("list-smart-lists: unwraps the lower-cased `smartlists` key", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _metadata: { collection: "smartlists" }, smartlists: [{ id: 14 }] },
  }]);
  const result = await run<{ records: unknown[] }>(listSmartLists, { all: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/smartLists");
  assertEquals(url.searchParams.get("all"), "true");
  assertEquals(result.records.length, 1);
});

/** The default returns only classic-UI lists, which on a modern account is often none. */

/** The default returns only classic-UI lists, which on a modern account is often none. */
Deno.test("list-smart-lists: warns that the default hides current-UI lists", () => {
  assert(/classic/i.test(listSmartLists.description!), listSmartLists.description);
  assert(param(listSmartLists, "all").hint?.includes("Almost always what you want"));
});
