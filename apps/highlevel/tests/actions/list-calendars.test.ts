import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/list-calendars.ts";

Deno.test("list-calendars: GETs /calendars/ with the calendars Version header", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { calendars: [] } }], "loc-1");
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/calendars/");
  assertEquals(url.searchParams.get("locationId"), "loc-1");
  assertEquals(calls[0].headers["version"], "2021-04-15");
});
