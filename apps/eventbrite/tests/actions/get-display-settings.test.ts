import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-display-settings.ts";

Deno.test("get-display-settings: GET /events/e%2F1/display_settings/", async () => {
  const resp = { "show_map": true };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({ "eventId": "e/1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/events/e%2F1/display_settings/");
  assertEquals(calls[0].body, null);
  assertEquals(result, resp);
});
