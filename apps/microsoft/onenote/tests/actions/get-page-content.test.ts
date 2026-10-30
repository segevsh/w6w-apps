import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-page-content.ts";

test("get-page-content: reads raw HTML text, not JSON", async () => {
  const html = "<html><head><title>Hi</title></head><body><p>hello</p></body></html>";
  const { ctx, calls } = mockCtx([{ body: html, headers: { "content-type": "text/html" } }]);
  const out = await action.execute({ pageId: "p1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/pages/p1/content");
  assertEquals(out.content, html);
});

test("get-page-content: Include element IDs sets ?includeIDs=true", async () => {
  const { ctx, calls } = mockCtx([{ body: "<html></html>" }]);
  await action.execute({ pageId: "p1", includeIds: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("includeIDs"), "true");
});

test("get-page-content: omitted by default", async () => {
  const { ctx, calls } = mockCtx([{ body: "<html></html>" }]);
  await action.execute({ pageId: "p1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("includeIDs"), false);
});
