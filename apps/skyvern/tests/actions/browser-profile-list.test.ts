import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import browserProfileList from "../../actions/browser-profile-list.ts";

Deno.test("browser-profile-list: query mapping and array wrapping", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ browser_profile_id: "bp_1" }] }]);
  const out = await browserProfileList.execute(
    { page: 1, pageSize: 20, searchKey: "gmail", managed: "false" },
    ctx,
  );
  assertEquals(out, { browser_profiles: [{ browser_profile_id: "bp_1" }], count: 1 });
  assertEquals(pathOf(calls[0].url), "/v1/browser_profiles");
  assertEquals(queryOf(calls[0].url), {
    page: "1",
    page_size: "20",
    search_key: "gmail",
    managed: "false",
  });
});
