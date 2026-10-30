import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/leads-list-update.ts";

test("leads-list-update: PUTs /leads_lists/{id} with the new name", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ id: 1, name: "New leads list name" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads_lists/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "New leads list name" });
});

test("leads-list-update: an unset folder id is omitted, an explicit null is sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { status: 204 }]);
  await action.execute!({ id: 1, name: "A" }, ctx);
  assertEquals("leads_list_folder_id" in JSON.parse(calls[0].body!), false);

  await action.execute!({ id: 1, name: "A", leadsListFolderId: null }, ctx);
  const sent = JSON.parse(calls[1].body!);
  assertEquals(sent.leads_list_folder_id, null);
});

test("leads-list-update: is marked idempotent", () => {
  assertEquals(action.idempotent, true);
});
