import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/add-column.ts";

const ok = () => mockCtx([{ status: 200, body: { message: "SUCCESS", result: { id: 1 } } }]);

Deno.test("add-column: is a non-idempotent perform over the column resource", () => {
  assertEquals(action.key, "add-column");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "column");
  assertEquals(action.idempotent, false);
});

Deno.test("add-column: POSTs title, type and index — the three required attributes", async () => {
  const { ctx, calls } = ok();
  await action.execute({
    sheetId: "4583173393803140",
    title: "Owner",
    type: "CONTACT_LIST",
    index: 2,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/sheets/4583173393803140/columns");
  assertEquals(JSON.parse(calls[0].body!), { title: "Owner", type: "CONTACT_LIST", index: 2 });
});

Deno.test("add-column: index 0 survives — it is a real position, not an absence", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", title: "A", type: "TEXT_NUMBER", index: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).index, 0);
});

Deno.test("add-column: marks index required, because the API does", () => {
  assertEquals(param(action, "index").required, true);
  assert(/required by the API/i.test(param(action, "index").hint ?? ""));
});

Deno.test("add-column: offers exactly the creatable column types", () => {
  assertEquals(optionValues(action, "type"), [
    "TEXT_NUMBER",
    "CHECKBOX",
    "PICKLIST",
    "MULTI_PICKLIST",
    "CONTACT_LIST",
    "MULTI_CONTACT_LIST",
    "DATE",
    "DATETIME",
  ]);
});

Deno.test("add-column: carries picklist options and a symbol through", async () => {
  const a = ok();
  await action.execute(
    { sheetId: "1", title: "Status", type: "PICKLIST", index: 1, options: ["To Do", "Done"] },
    a.ctx,
  );
  assertEquals(JSON.parse(a.calls[0].body!).options, ["To Do", "Done"]);

  const b = ok();
  await action.execute(
    { sheetId: "1", title: "Flag", type: "CHECKBOX", index: 1, symbol: "FLAG" },
    b.ctx,
  );
  assertEquals(JSON.parse(b.calls[0].body!).symbol, "FLAG");
});

Deno.test("add-column: omits every optional attribute that was not supplied", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", title: "A", type: "TEXT_NUMBER", index: 0 }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), ["index", "title", "type"]);
});

Deno.test("add-column: keeps false for hidden/locked, which are meaningful values", async () => {
  const { ctx, calls } = ok();
  await action.execute(
    { sheetId: "1", title: "A", type: "TEXT_NUMBER", index: 0, hidden: false, locked: false },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.hidden, false);
  assertEquals(body.locked, false);
});
