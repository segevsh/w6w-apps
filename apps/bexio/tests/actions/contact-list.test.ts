import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: GETs /2.0/contact with mapped query", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name_1: "Acme" }] }]);
  const result = await action.execute!({
    orderBy: "name_1",
    descending: true,
    limit: 50,
    offset: 10,
    showArchived: true,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/contact");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("order_by"), "name_1_desc");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("offset"), "10");
  assertEquals(url.searchParams.get("show_archived"), "true");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(result, [{ id: 1, name_1: "Acme" }]);
});

Deno.test("contact-list: omits query params that are unset", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("order_by"), false);
  assertEquals(url.searchParams.has("limit"), false);
});
