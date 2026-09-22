import { assertEquals, assertRejects } from "@std/assert";
import deleteAffiliate from "../../actions/delete-affiliate.ts";
import { errorResponse, mockCtx, okResponse, pathOf, xmlDataOf } from "../_helpers.ts";

Deno.test("delete-affiliate: wraps the id in <affiliate> and POSTs to deleteRecord", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse() }]);
  const out = await deleteAffiliate.execute({ id: "Ag==" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/affiliate/deleteRecord");
  assertEquals(xmlDataOf(calls[0].body), "<crcloud><affiliate><id>Ag==</id></affiliate></crcloud>");
  assertEquals(out.success, true);
  assertEquals(out.result, null);
});

Deno.test("delete-affiliate: a second delete surfaces the vendor's 4417", async () => {
  const { ctx } = mockCtx([{ body: errorResponse(4417, "Incorrect Affiliate ID") }]);
  await assertRejects(
    async () => {
      await deleteAffiliate.execute({ id: "already-gone" }, ctx);
    },
    Error,
    "Incorrect Affiliate ID",
  );
});
