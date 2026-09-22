import { assertEquals, assertRejects } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/predefined-tag-get-many.ts";

Deno.test("predefined-tag-get-many: GETs the underscore path with no parameters", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [{ id: 54, name: "US", category: "Origin" }] }]);
  const page = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/predefined_tags");
  assertEquals(page.items, [{ id: 54, name: "US", category: "Origin" }]);
});

Deno.test("predefined-tag-get-many: a non-admin USER token is reported verbatim", async () => {
  // The vendor's own status table names an extra 401 type for this endpoint.
  const { ctx } = mockNocrmCtx([{
    status: 401,
    body: { error: 401, message: "Unauthorized: non admin", type: "unauthorized_non_admin" },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute({}, ctx)),
    Error,
    "unauthorized_non_admin",
  );
});
