import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { SPREADSHEET_ID, spreadsheetIdFrom } from "../../lib/params.ts";
import { parseParams } from "@w6w/types";

const ID = "1OQ_egJWTCDY0J7NI3v6GJ9L7K1oHJGCF6WgDnT_Rwnk";

test("spreadsheetIdFrom: a pasted Sheets URL yields its id", () => {
  assertEquals(
    spreadsheetIdFrom(`https://docs.google.com/spreadsheets/d/${ID}/edit?gid=0#gid=0`),
    ID,
  );
  assertEquals(spreadsheetIdFrom(`https://docs.google.com/spreadsheets/u/1/d/${ID}/edit`), ID);
  assertEquals(spreadsheetIdFrom(`  https://docs.google.com/spreadsheets/d/${ID}  `), ID);
});

test("spreadsheetIdFrom: a bare id passes through (trimmed); non-strings untouched", () => {
  assertEquals(spreadsheetIdFrom(ID), ID);
  assertEquals(spreadsheetIdFrom(` ${ID} `), ID);
  assertEquals(spreadsheetIdFrom(undefined), undefined);
});

test("SPREADSHEET_ID: the shared param parses a URL via parseParams", async () => {
  const out = await parseParams([SPREADSHEET_ID], {
    spreadsheetId: `https://docs.google.com/spreadsheets/d/${ID}/edit?gid=0#gid=0`,
  });
  assertEquals(out, { spreadsheetId: ID });
});
