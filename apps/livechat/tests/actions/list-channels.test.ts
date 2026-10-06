import { assertEquals } from "@std/assert";
import action from "../../actions/list-channels.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-channels: sends an empty body and returns the channels", async () => {
  const rows = [{
    channel_type: "code",
    channel_subtype: "",
    first_activity_timestamp: "2017-10-12T13:56:16Z",
  }];
  const { ctx, calls } = mockCtx([{ body: rows }]);
  const out = await action.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/configuration/action/list_channels");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { items: rows, count: 1 });
});
