import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-display-settings.ts";

Deno.test("update-display-settings: POST /events/e1/display_settings/", async () => {
  const resp = { "show_map": false };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({
    "eventId": "e1",
    "showMap": false,
    "showRemaining": true,
    "terminology": "endurance_vertical",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/events/e1/display_settings/");
  assertEquals(JSON.parse(calls[0].body!), {
    "display_settings": {
      "show_map": false,
      "show_remaining": true,
      "terminology": "endurance_vertical",
    },
  });
  assertEquals(result, resp);
});

Deno.test("update-display-settings: sends only supplied fields and deep-merges extra", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ "eventId": "e1", "extra": { "zzz": { "a": 1 } } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { "display_settings": { "zzz": { "a": 1 } } });
});
