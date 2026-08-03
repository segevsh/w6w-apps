import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/delete-rows.ts";

const ok = () => mockCtx([{ status: 200, body: { message: "SUCCESS", result: [1, 2] } }]);

Deno.test("delete-rows: is an idempotent perform", () => {
  assertEquals(action.key, "delete-rows");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("delete-rows: DELETEs with ids in the query string and no body", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "4583173393803140", rowIds: "1,2,3" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/sheets/4583173393803140/rows");
  assertEquals(new URL(calls[0].url).searchParams.get("ids"), "1,2,3");
  // The operation declares no request body.
  assertEquals(calls[0].body, null);
});

Deno.test("delete-rows: accepts a list and joins it into the single ids param", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", rowIds: ["8896508249565060", "8896508249565061"] }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("ids"),
    "8896508249565060,8896508249565061",
  );
});

Deno.test("delete-rows: defaults ignoreRowsNotFound to true, so a replay is not an error", async () => {
  // Smartsheet's own default is false, which deletes NOTHING and errors when an
  // id is already gone — exactly what a retry produces.
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", rowIds: "1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("ignoreRowsNotFound"), "true");
  assertEquals(param(action, "ignoreRowsNotFound").default, true);
});

Deno.test("delete-rows: an explicit false drops the flag, restoring the API default", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", rowIds: "1", ignoreRowsNotFound: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("ignoreRowsNotFound"), false);
});

Deno.test("delete-rows: refuses an empty id list rather than deleting on a blank param", () => {
  const { ctx } = ok();
  assertThrows(() => action.execute({ sheetId: "1", rowIds: "" }, ctx), Error, "rowIds");
  assertThrows(() => action.execute({ sheetId: "1", rowIds: [] }, ctx), Error, "rowIds");
});

Deno.test("delete-rows: says that child rows go too", () => {
  assert(/child rows/i.test(action.description!));
});
