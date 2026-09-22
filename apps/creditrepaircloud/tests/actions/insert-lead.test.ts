import { assert, assertEquals, assertRejects } from "@std/assert";
import insertLead from "../../actions/insert-lead.ts";
import { errorResponse, mockCtx, okResponse, pathOf, xmlDataOf } from "../_helpers.ts";

Deno.test("insert-lead: POSTs the documented document to /api/lead/insertRecord", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse("<id>MQ==</id>") }]);
  const out = await insertLead.execute({
    type: "Lead",
    firstname: "Ada",
    lastname: "Lovelace",
    email: "ada@example.com",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/lead/insertRecord");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(
    xmlDataOf(calls[0].body),
    "<crcloud><lead><type>Lead</type><firstname>Ada</firstname><lastname>Lovelace</lastname>" +
      "<email>ada@example.com</email></lead></crcloud>",
  );
  assertEquals(out.success, true);
  assertEquals(out.result, { id: "MQ==" });
});

Deno.test("insert-lead: escapes user data and drops the fields left empty", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse() }]);
  await insertLead.execute({
    type: "Client",
    firstname: "A & B <script>",
    lastname: "O'Brien",
    city: "",
    phone_work: undefined,
    memo: `"quoted"`,
  }, ctx);

  const xml = xmlDataOf(calls[0].body)!;
  assertEquals(
    xml,
    "<crcloud><lead><type>Client</type><firstname>A &amp; B &lt;script&gt;</firstname>" +
      "<lastname>O&apos;Brien</lastname><memo>&quot;quoted&quot;</memo></lead></crcloud>",
  );
  assert(!xml.includes("<city>"), xml);
  assert(!xml.includes("<phone_work>"), xml);
});

Deno.test("insert-lead: sends the insert-only portal fields when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse() }]);
  await insertLead.execute({
    type: "Client",
    firstname: "Ada",
    lastname: "Lovelace",
    client_portal_access: "on",
    client_userid: "ada@example.com",
    send_setup_password_info_via_email: "yes",
  }, ctx);

  const xml = xmlDataOf(calls[0].body)!;
  assert(xml.includes("<client_portal_access>on</client_portal_access>"), xml);
  assert(xml.includes("<client_userid>ada@example.com</client_userid>"), xml);
  assert(
    xml.includes("<send_setup_password_info_via_email>yes</send_setup_password_info_via_email>"),
    xml,
  );
});

Deno.test("insert-lead: the vendor's own failure message surfaces", async () => {
  const { ctx } = mockCtx([{ body: errorResponse(4402, "Mandatory field missing") }]);
  await assertRejects(
    async () => {
      await insertLead.execute({ type: "Lead", firstname: "", lastname: "" }, ctx);
    },
    Error,
    "Mandatory field missing",
  );
});
