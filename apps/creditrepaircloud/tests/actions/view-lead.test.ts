import { assert, assertEquals, assertRejects } from "@std/assert";
import viewLead from "../../actions/view-lead.ts";
import { errorResponse, mockCtx, okResponse, pathOf, xmlDataOf } from "../_helpers.ts";

Deno.test("view-lead: POSTs the id and returns the vendor's <result> children generically", async () => {
  const { ctx, calls } = mockCtx([{
    body: okResponse("<id>MQ==</id><firstname>Ada</firstname><status>Client</status>"),
  }]);
  const out = await viewLead.execute({ id: "MQ==" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/lead/viewRecord");
  assertEquals(xmlDataOf(calls[0].body), "<crcloud><client><id>MQ==</id></client></crcloud>");
  assertEquals(out.success, true);
  // The action claims no field names of its own: it hands back what came in.
  assertEquals(out.result, { id: "MQ==", firstname: "Ada", status: "Client" });
  assert(out.raw.startsWith("<?xml"), out.raw);
});

Deno.test("view-lead: a missing record is the vendor's own error, not an empty result", async () => {
  const { ctx } = mockCtx([{ body: errorResponse(4413, "Incorrect Client ID") }]);
  await assertRejects(
    async () => {
      await viewLead.execute({ id: "nope" }, ctx);
    },
    Error,
    "Incorrect Client ID",
  );
});
