import { assert, assertEquals, assertRejects } from "@std/assert";
import updateAffiliate from "../../actions/update-affiliate.ts";
import { errorResponse, mockCtx, okResponse, pathOf, xmlDataOf } from "../_helpers.ts";

Deno.test("update-affiliate: POSTs the id and the Update table's `post_code`", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse("<id>Ag==</id>") }]);
  const out = await updateAffiliate.execute({
    id: "Ag==",
    type: "Inactive",
    firstname: "Grace",
    lastname: "Hopper",
    post_code: "07030",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/affiliate/updateRecord");
  assertEquals(
    xmlDataOf(calls[0].body),
    "<crcloud><affiliate><id>Ag==</id><type>Inactive</type><firstname>Grace</firstname>" +
      "<lastname>Hopper</lastname><post_code>07030</post_code></affiliate></crcloud>",
  );
  assertEquals(out.success, true);
});

Deno.test("update-affiliate: `post_code`, never `zip` — the vendor's own inconsistency, kept", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse() }]);
  await updateAffiliate.execute({
    id: "Ag==",
    type: "Active",
    firstname: "G",
    lastname: "H",
    post_code: "07030",
  }, ctx);
  const xml = xmlDataOf(calls[0].body)!;
  assert(xml.includes("<post_code>07030</post_code>"), xml);
  assert(!xml.includes("<zip>"), xml);
  // The Update table drops the insert-only portal fields.
  for (const dropped of ["affiliate_portal_access", "affiliate_userid"]) {
    assert(!xml.includes(dropped), `${dropped} should not be on the wire: ${xml}`);
  }
});

Deno.test("update-affiliate: an unknown affiliate surfaces 4417", async () => {
  const { ctx } = mockCtx([{ body: errorResponse(4417, "Incorrect Affiliate ID") }]);
  await assertRejects(
    async () => {
      await updateAffiliate.execute(
        { id: "nope", type: "Active", firstname: "G", lastname: "H" },
        ctx,
      );
    },
    Error,
    "Incorrect Affiliate ID",
  );
});
