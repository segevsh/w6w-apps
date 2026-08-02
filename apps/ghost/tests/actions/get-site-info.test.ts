import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-site-info.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("get-site-info: is opted out of requiring auth", () => {
  assertEquals(action.requiresAuth, false);
});

Deno.test("get-site-info: GETs the unauthenticated /site/ and unwraps the bare object", async () => {
  const { ctx, calls } = mockCtx([{ body: { site: { title: "My Blog", version: "5.100" } } }], {
    display,
  });
  const result = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/site/");
  assertEquals(result, { title: "My Blog", version: "5.100" });
});
