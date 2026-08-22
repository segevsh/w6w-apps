import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-list.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("asset-list: resource and delivery type are path segments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { resources: [] } }], conn);
  await action.execute!({ resourceType: "video", type: "private", prefix: "clips/" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1_1/acme/resources/video/private");
  assertEquals(url.searchParams.get("prefix"), "clips/");
});

/** Cloudinary omits tags and context unless asked; most workflows want them. */
Deno.test("asset-list: tags and context are requested by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { resources: [] } }], conn);
  await action.execute!({}, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("tags"), "true");
  assertEquals(q.get("context"), "true");
  // Sent explicitly rather than omitted, so the request says what it means.
  assertEquals(q.get("metadata"), "false");
});
