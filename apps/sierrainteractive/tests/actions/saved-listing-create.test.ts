import { assertEquals } from "@std/assert";
import savedListingCreate from "../../actions/saved-listing-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("saved-listing-create: POST /zapier/savedListings", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await savedListingCreate.execute(
    { leadIdOrEmail: "a@b.com", mlsNumber: "123", mlsRegion: "ABC" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/zapier/savedListings");
  assertEquals(bodyOf(calls[0]), { leadIdOrEmail: "a@b.com", mlsNumber: "123", mlsRegion: "ABC" });
});
