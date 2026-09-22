import { assert, assertEquals, assertRejects } from "@std/assert";
import insertAffiliate from "../../actions/insert-affiliate.ts";
import { errorResponse, mockCtx, okResponse, pathOf, xmlDataOf } from "../_helpers.ts";

Deno.test("insert-affiliate: POSTs the documented document with `zip`", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse("<id>Ag==</id>") }]);
  const out = await insertAffiliate.execute({
    type: "Active",
    firstname: "Grace",
    lastname: "Hopper",
    email: "grace@example.com",
    phone: "555-0100",
    company: "Navy & Co",
    zip: "07030",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/affiliate/insertRecord");
  assertEquals(
    xmlDataOf(calls[0].body),
    "<crcloud><affiliate><type>Active</type><firstname>Grace</firstname>" +
      "<lastname>Hopper</lastname><email>grace@example.com</email><phone>555-0100</phone>" +
      "<company>Navy &amp; Co</company><zip>07030</zip></affiliate></crcloud>",
  );
  assertEquals(out.success, true);
});

Deno.test("insert-affiliate: the Insert table's name for the postal code is `zip`, not `post_code`", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse() }]);
  await insertAffiliate.execute({
    type: "Pending",
    firstname: "G",
    lastname: "H",
    email: "g@example.com",
    phone: "1",
    zip: "07030",
  }, ctx);
  const xml = xmlDataOf(calls[0].body)!;
  assert(xml.includes("<zip>07030</zip>"), xml);
  assert(!xml.includes("post_code"), xml);
  // `fax` is in that page's example XML but not its parameters table: not sent.
  assert(!xml.includes("fax"), xml);
});

Deno.test("insert-affiliate: an invalid email surfaces the vendor's 4403", async () => {
  const { ctx } = mockCtx([{ body: errorResponse(4403, "Email address Invalid") }]);
  await assertRejects(
    async () => {
      await insertAffiliate.execute({
        type: "Active",
        firstname: "G",
        lastname: "H",
        email: "not-an-email",
        phone: "1",
      }, ctx);
    },
    Error,
    "Email address Invalid",
  );
});
