import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-page.ts";

test("create-page: POSTs /pages under a parent page with a title property", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "page", id: "page-child" } }]);
  await action.execute({ parentPageId: "parent-1", title: "Welcome" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.parent, { page_id: "parent-1" });
  assertEquals(sent.properties.title.title[0].text.content, "Welcome");
});
