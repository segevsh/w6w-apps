import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/import-contacts.ts";

const rows = [
  { email: "a@b.test", first_name: "Ada", "cf:membership_level": "gold" },
  { email: "c@d.test" },
];

Deno.test("import-contacts: POSTs /v3/activities/contacts_json_import", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { activity_id: "a1", state: "initialized" },
  }]);
  await action.execute!({ importData: rows, listIds: ["l1"] }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/activities/contacts_json_import");
});

Deno.test("import-contacts: passes rows through verbatim, including cf: keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ importData: rows, listIds: ["l1", "l2"] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.import_data, rows);
  assertEquals(body.list_ids, ["l1", "l2"]);
});

Deno.test("import-contacts: sends sms_permission_to_send only when supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }, { status: 201, body: {} }]);
  await action.execute!({
    importData: rows,
    listIds: ["l1"],
    smsPermissionToSend: "explicit",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sms_permission_to_send, "explicit");
  await action.execute!({ importData: rows, listIds: ["l1"] }, ctx);
  assertEquals("sms_permission_to_send" in JSON.parse(calls[1].body!), false);
});

Deno.test("import-contacts: returns the queued activity for polling", async () => {
  const { ctx } = mockCtx([{
    status: 201,
    body: { activity_id: "a1", state: "initialized", status: { items_total_count: 2 } },
  }]);
  const out = await action.execute!({ importData: rows, listIds: ["l1"] }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.activity_id, "a1");
  assertEquals(out.state, "initialized");
});

Deno.test("import-contacts: logs the row count", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ importData: rows, listIds: ["l1"] }, ctx);
  assertEquals(logs[0].level, "info");
  assertEquals(logs[0].data, { rows: 2 });
});

Deno.test("import-contacts: is declared idempotent — the import keys on email", () => {
  assertEquals(action.idempotent, true);
});
