import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-list.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("tag-list: tags are per resource type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tags: ["vip"] } }], conn);
  await action.execute!({ resourceType: "video", prefix: "campaign:" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1_1/acme/tags/video");
  assertEquals(url.searchParams.get("prefix"), "campaign:");
});
