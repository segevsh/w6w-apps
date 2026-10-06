import { assertEquals } from "@std/assert";
import action from "../../actions/link-expand.ts";
import { LINK, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("link-expand: GETs /links/expand with domain and path", async () => {
  const { ctx, calls } = mockCtx([{ body: LINK }]);
  const out = await action.execute({ domain: "go.example.com", path: "spring" }, ctx);
  assertEquals(pathOf(calls[0].url), "/links/expand");
  assertEquals(queryOf(calls[0].url), { domain: "go.example.com", path: "spring" });
  assertEquals(out.idString, "lnk_abc_def");
});
