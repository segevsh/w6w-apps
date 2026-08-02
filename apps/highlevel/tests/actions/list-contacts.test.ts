import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/list-contacts.ts";

Deno.test("list-contacts: GETs /contacts/ scoped to the connection's location", async () => {
  const { ctx, calls } = mockHighLevelCtx([
    { body: { contacts: [{ id: "c1" }], count: 1 } },
  ], "loc-1");
  const out = await action.execute!({ limit: 25, startAfterId: "c0" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/contacts/");
  assertEquals(url.searchParams.get("locationId"), "loc-1");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("startAfterId"), "c0");
  const body = out as { contacts: unknown[]; count: number };
  assertEquals(body.contacts.length, 1);
  assertEquals(body.count, 1);
});
