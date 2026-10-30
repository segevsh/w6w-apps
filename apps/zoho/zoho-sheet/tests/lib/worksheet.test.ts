import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import { requireWorksheetLocator } from "../../lib/worksheet.ts";

test("requireWorksheetLocator: prefers worksheetName, trims it", () => {
  assertEquals(
    requireWorksheetLocator({ worksheetName: " Sheet1 ", worksheetId: "0#" }),
    { worksheet_name: "Sheet1", worksheet_id: "0#" },
  );
});

test("requireWorksheetLocator: accepts worksheetId alone", () => {
  assertEquals(
    requireWorksheetLocator({ worksheetId: "0#" }),
    { worksheet_name: undefined, worksheet_id: "0#" },
  );
});

test("requireWorksheetLocator: throws when neither is set", () => {
  assertThrows(() => requireWorksheetLocator({}), Error, "worksheetName");
});

test("requireWorksheetLocator: throws when both are blank", () => {
  assertThrows(() => requireWorksheetLocator({ worksheetName: "  " }), Error, "worksheetName");
});
