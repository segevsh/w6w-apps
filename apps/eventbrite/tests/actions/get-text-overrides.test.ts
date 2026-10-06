import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-text-overrides.ts";

Deno.test("get-text-overrides: sends text_codes and filters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    organizationId: "5",
    textCodes: ["tickets_sold_out", "event_cancelled"],
    locale: "en_US",
    eventId: "e1",
    venueId: "v1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/organizations/5/text_overrides/");
  assertEquals(url.searchParams.get("text_codes"), "tickets_sold_out,event_cancelled");
  assertEquals(url.searchParams.get("locale"), "en_US");
  assertEquals(url.searchParams.get("event_id"), "e1");
  assertEquals(url.searchParams.get("venue_id"), "v1");
});
