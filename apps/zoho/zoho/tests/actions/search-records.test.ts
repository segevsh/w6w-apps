import { assertEquals, assertThrows } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/search-records.ts";

Deno.test("search-records: GETs /{module}/search with the given criteria", async () => {
  const { ctx, calls } = mockZohoCtx([{ body: { data: [{ id: "1" }], info: { count: 1 } } }]);
  const out = await action.execute(
    { module: "Contacts", criteria: "(Last_Name:equals:Smith)" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/crm/v6/Contacts/search");
  assertEquals(url.searchParams.get("criteria"), "(Last_Name:equals:Smith)");
  assertEquals(out, { data: [{ id: "1" }], info: { count: 1 } });
});

Deno.test("search-records: works with email/phone/word too", async () => {
  const { ctx, calls } = mockZohoCtx([{ body: { data: [] } }]);
  await action.execute({ module: "Leads", word: "acme" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("word"), "acme");
});

Deno.test("search-records: rejects when none of criteria/email/phone/word is given", () => {
  const { ctx, calls } = mockZohoCtx();
  assertThrows(
    () => action.execute!({ module: "Leads" }, ctx),
    Error,
    "requires one of",
  );
  assertEquals(calls.length, 0);
});
