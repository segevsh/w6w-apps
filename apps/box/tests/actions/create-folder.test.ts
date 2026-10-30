import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-folder.ts";

test("create-folder: POSTs /folders with name and parent.id, defaulting parent to root", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1", name: "Invoices" } }]);
  await action.execute!({ name: "Invoices" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/folders");
  assertEquals(calls[0].method, "POST");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.name, "Invoices");
  assertEquals(payload.parent, { id: "0" });
});

test("create-folder: forwards a given parentId", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ name: "2026", parentId: "42" }, ctx);
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.parent, { id: "42" });
});
