import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/files-list.ts";

test("files-list: GETs /files with no query by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], object: "list" } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/files");
  assert(!url.searchParams.has("purpose"));
});

test("files-list: forwards purpose filter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ purpose: "assistants" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("purpose"), "assistants");
});
