import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listOtnTopics from "../../actions/list-otn-topics.ts";

Deno.test("list-otn-topics: GETs the OTN topics endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await listOtnTopics.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/getOtnTopics");
});

Deno.test("list-otn-topics: exposes the NAME, which is what Send Content spends", async () => {
  const { ctx } = mockCtx([
    { body: { status: "success", data: [{ id: 5, name: "Channel news", description: "" }] } },
  ]);
  const out = await listOtnTopics.execute!({}, ctx) as { data: Array<{ name: string }> };
  assertEquals(out.data[0].name, "Channel news");
});
