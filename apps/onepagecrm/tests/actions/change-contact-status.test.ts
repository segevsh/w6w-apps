import { assertEquals } from "@std/assert";
import changeContactStatus from "../../actions/change-contact-status.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("change-contact-status: PUT .../change_status/{status_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ contact: { id: "c1", status_id: "s2" } }) }]);
  const out = await changeContactStatus.execute({ contactId: "c1", statusId: "s2" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts/c1/change_status/s2");
  assertEquals(out.contact, { id: "c1", status_id: "s2" });
});
