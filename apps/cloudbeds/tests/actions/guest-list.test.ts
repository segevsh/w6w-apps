import { assertEquals } from "@std/assert";
import guestList from "../../actions/guest-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("guest-list: GET /getGuestList with the given filters", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ guests: [] }) }]);
  await guestList.execute({ guestFirstName: "Ada", status: "in_progress,confirmed" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1.3/getGuestList");
  assertEquals(queryOf(calls[0].url), { guestFirstName: "Ada", status: "in_progress,confirmed" });
});

Deno.test("guest-list: every filter is optional", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await guestList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
