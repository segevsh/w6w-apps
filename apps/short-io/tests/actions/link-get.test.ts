import { assert, assertEquals } from "@std/assert";
import action from "../../actions/link-get.ts";
import { LINK, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("link-get: GETs /links/{id} and strips the password", async () => {
  const { ctx, calls } = mockCtx([{ body: LINK }]);
  const out = await action.execute({ linkId: "lnk_abc_def" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/links/lnk_abc_def");
  assertEquals(out.shortURL, "https://go.example.com/spring");
  assert(!("password" in out));
});
