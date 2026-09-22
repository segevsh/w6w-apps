import { assertEquals, assertRejects } from "@std/assert";
import viewAffiliate from "../../actions/view-affiliate.ts";
import { errorResponse, mockCtx, okResponse, pathOf, xmlDataOf } from "../_helpers.ts";

Deno.test("view-affiliate: reads one affiliate with the documented document shape", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse("<id>Ag==</id><company>Navy</company>") }]);
  const out = await viewAffiliate.execute({ id: "Ag==" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/affiliate/viewRecord");
  assertEquals(xmlDataOf(calls[0].body), "<crcloud><affiliate><id>Ag==</id></affiliate></crcloud>");
  assertEquals(out.success, true);
  assertEquals(out.result, { id: "Ag==", company: "Navy" });
});

Deno.test("view-affiliate: a wrong id surfaces the vendor's own error", async () => {
  const { ctx } = mockCtx([{ body: errorResponse(4417, "Incorrect Affiliate ID") }]);
  await assertRejects(
    async () => {
      await viewAffiliate.execute({ id: "nope" }, ctx);
    },
    Error,
    "Incorrect Affiliate ID",
  );
});
