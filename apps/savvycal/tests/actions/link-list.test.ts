import { assertEquals } from "@std/assert";
import linkList from "../../actions/link-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("link-list: GET /v1/links with paging and state", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "link_1" }], "c2") }]);
  const out = await linkList.execute({ limit: 10, after: "c1", state: "active" }, ctx) as {
    metadata: { after: string };
  };
  assertEquals(pathOf(calls[0].url), "/v1/links");
  assertEquals(queryOf(calls[0].url), { limit: "10", after: "c1", state: "active" });
  assertEquals(out.metadata.after, "c2");
});
