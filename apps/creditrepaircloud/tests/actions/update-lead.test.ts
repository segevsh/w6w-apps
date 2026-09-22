import { assert, assertEquals, assertRejects } from "@std/assert";
import updateLead from "../../actions/update-lead.ts";
import { errorResponse, mockCtx, okResponse, pathOf, xmlDataOf } from "../_helpers.ts";

Deno.test("update-lead: names the record and POSTs to /api/lead/updateRecord", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse("<id>MQ==</id>") }]);
  const out = await updateLead.execute({
    id: "MQ==",
    type: "Client",
    firstname: "Ada",
    lastname: "Lovelace",
    post_code: "90210",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/lead/updateRecord");
  assertEquals(
    xmlDataOf(calls[0].body),
    "<crcloud><lead><id>MQ==</id><type>Client</type><firstname>Ada</firstname>" +
      "<lastname>Lovelace</lastname><post_code>90210</post_code></lead></crcloud>",
  );
  assertEquals(out.success, true);
});

Deno.test("update-lead: never sends the fields the vendor's Update table drops", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse() }]);
  await updateLead.execute({ id: "MQ==", type: "Lead", firstname: "A", lastname: "B" }, ctx);
  const xml = xmlDataOf(calls[0].body)!;
  for (
    const dropped of [
      "client_portal_access",
      "client_userid",
      "client_agreement",
      "send_setup_password_info_via_email",
    ]
  ) {
    assert(!xml.includes(dropped), `${dropped} should not be on the wire: ${xml}`);
  }
});

Deno.test("update-lead: a wrong record id surfaces the vendor's own code", async () => {
  const { ctx } = mockCtx([{ body: errorResponse(4410, "Wrong ID in update") }]);
  await assertRejects(
    async () => {
      await updateLead.execute({ id: "nope", type: "Lead", firstname: "A", lastname: "B" }, ctx);
    },
    Error,
    "Wrong ID in update",
  );
});
