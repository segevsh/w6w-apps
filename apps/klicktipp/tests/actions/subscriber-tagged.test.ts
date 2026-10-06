import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-tagged.ts";

Deno.test("subscriber-tagged: sends the documented default filters and reshapes the map", async () => {
  const { ctx, calls } = mockCtx([{ body: { "3": "1760530436", "8": "1760530500" } }]);
  const out = await action.execute({ tagId: 20 }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/tagged");
  assertEquals(JSON.parse(calls[0].body!), {
    tagid: 20,
    status: ["subscribed"],
    bounceStatus: ["softbounce", "spambounce", "nobounce"],
  });
  assertEquals(out, {
    subscribers: [
      { subscriberId: "3", taggedAt: 1760530436 },
      { subscriberId: "8", taggedAt: 1760530500 },
    ],
  });
});

Deno.test("subscriber-tagged: honours explicit filters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ tagId: 20, status: ["pending"], bounceStatus: "hardbounce" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.status, ["pending"]);
  assertEquals(sent.bounceStatus, ["hardbounce"]);
});
