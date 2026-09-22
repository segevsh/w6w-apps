import { assertEquals, assertRejects } from "@std/assert";
import deleteLead from "../../actions/delete-lead.ts";
import { errorResponse, mockCtx, okResponse, pathOf, xmlDataOf } from "../_helpers.ts";

Deno.test("delete-lead: wraps the id in <client>, the vendor's own example shape", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse() }]);
  const out = await deleteLead.execute({ id: "MQ==" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/lead/deleteRecord");
  assertEquals(xmlDataOf(calls[0].body), "<crcloud><client><id>MQ==</id></client></crcloud>");
  assertEquals(out.success, true);
  assertEquals(out.result, null);
});

Deno.test("delete-lead: an id the vendor does not recognise surfaces 4413", async () => {
  const { ctx } = mockCtx([{ body: errorResponse(4413, "Incorrect Client ID") }]);
  await assertRejects(
    async () => {
      await deleteLead.execute({ id: "already-gone" }, ctx);
    },
    Error,
    "Incorrect Client ID",
  );
});
