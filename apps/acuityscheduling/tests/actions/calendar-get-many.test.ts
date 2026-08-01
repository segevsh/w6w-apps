import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/calendar-get-many.ts";

Deno.test("calendar-get-many: GETs /calendars with no query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Main" }] }]);
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/calendars");
  assertEquals(url.search, "");
  assertEquals(result, [{ id: 1, name: "Main" }]);
});
