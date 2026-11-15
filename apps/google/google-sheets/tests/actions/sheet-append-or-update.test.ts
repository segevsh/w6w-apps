import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action, {
  columnLetter,
  matchColumn,
  normalizeRows,
} from "../../actions/sheet-append-or-update.ts";

test("sheet-append-or-update: updates matched rows and appends the rest", async () => {
  const { ctx, calls } = mockCtx([
    // 1. GET whole sheet — headers + two existing rows.
    {
      body: {
        values: [
          ["id", "name"],
          ["1", "Alice"],
          ["2", "Bob"],
        ],
      },
    },
    // 2. PUT for the update on the matched `id=2` row.
    { body: { updatedRange: "Sheet1!A3" } },
    // 3. Final append for the new `id=3` row.
    { body: { updates: { updatedRows: 1 } } },
  ]);

  const result = await action.execute({
    spreadsheetId: "ss-1",
    sheetName: "Sheet1",
    columnToMatchOn: "id",
    rows: [
      { id: "2", name: "Robert" }, // exists → update
      { id: "3", name: "Carol" }, // new → append
    ],
  }, ctx) as { updatedCount: number; appendedCount: number };

  // Read call.
  assertEquals(new URL(calls[0].url).pathname, "/v4/spreadsheets/ss-1/values/Sheet1");
  // Update call.
  assertEquals(new URL(calls[1].url).pathname, "/v4/spreadsheets/ss-1/values/Sheet1!A3");
  assertEquals(calls[1].method, "PUT");
  const updateBody = JSON.parse(calls[1].body!);
  assertEquals(updateBody.values, [["2", "Robert"]]);
  // Append call.
  assertEquals(new URL(calls[2].url).pathname, "/v4/spreadsheets/ss-1/values/Sheet1!A%3AA:append");
  const appendBody = JSON.parse(calls[2].body!);
  assertEquals(appendBody.values, [["3", "Carol"]]);
  assertEquals(result.updatedCount, 1);
  assertEquals(result.appendedCount, 1);
});

test("sheet-append-or-update: a column letter or a loosely-typed header finds the match column", async () => {
  for (const column of ["B", "b", " Email "]) {
    const { ctx, calls } = mockCtx([
      { body: { values: [["name", "email"], ["Alice", "a@x.io"]] } },
      { body: { updatedRange: "Sheet1!A2" } },
    ]);
    const result = await action.execute({
      spreadsheetId: "ss-1",
      sheetName: "Sheet1",
      columnToMatchOn: column,
      rows: [{ name: "Alicia", email: "a@x.io" }],
    }, ctx) as { updatedCount: number; appendedCount: number };
    assertEquals(result.updatedCount, 1, `column ${JSON.stringify(column)}`);
    assertEquals(result.appendedCount, 0);
    assertEquals(JSON.parse(calls[1].body!).values, [["Alicia", "a@x.io"]]);
  }
});

test("sheet-append-or-update: an unknown column names the headers it found", async () => {
  const { ctx } = mockCtx([{ body: { values: [["name", "email"]] } }]);
  let message = "";
  try {
    await action.execute({
      spreadsheetId: "ss-1",
      sheetName: "Sheet1",
      columnToMatchOn: "0",
      rows: [{ name: "x" }],
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(
    message,
    'Column to match on "0" is not a header in row 1 (headers found: "name", "email"), nor a column letter like A.',
  );
});

test("matchColumn: a header literally named like a letter wins over the letter", () => {
  assertEquals(matchColumn(["id", "A"], "A"), 1);
  assertEquals(matchColumn(["id", "name"], "Z"), -1);
});

test("sheet-append-or-update: fields with no column become new headers, then the row lands", async () => {
  // The sheet has only `SessionId`; the form sends other fields and no SessionId.
  const { ctx, calls } = mockCtx([
    { body: { values: [["SessionId"]] } },
    { body: { updatedRange: "Sheet1!B1:C1" } },
    { body: { updates: { updatedRows: 1 } } },
  ]);
  const result = await action.execute({
    spreadsheetId: "ss-1",
    sheetName: "Sheet1",
    columnToMatchOn: "SessionId",
    rows: [{ "Last Name": "Smith", "First Name": "Jo" }],
  }, ctx) as { updatedCount: number; appendedCount: number };
  assertEquals(calls[1].method, "PUT");
  assertEquals(new URL(calls[1].url).pathname, "/v4/spreadsheets/ss-1/values/Sheet1!B1");
  assertEquals(JSON.parse(calls[1].body!).values, [["Last Name", "First Name"]]);
  assertEquals(JSON.parse(calls[2].body!).values, [["", "Smith", "Jo"]]);
  assertEquals(result.appendedCount, 1);
  assertEquals(result.updatedCount, 0);
});

test("sheet-append-or-update: an empty sheet takes its header row from the rows", async () => {
  const { ctx, calls } = mockCtx([
    { body: {} },
    { body: {} },
    { body: { updates: { updatedRows: 1 } } },
  ]);
  await action.execute({
    spreadsheetId: "ss-1",
    sheetName: "Sheet1",
    columnToMatchOn: "email",
    rows: { email: "a@x.io", name: "A" },
  }, ctx);
  assertEquals(new URL(calls[1].url).pathname, "/v4/spreadsheets/ss-1/values/Sheet1!A1");
  assertEquals(JSON.parse(calls[1].body!).values, [["email", "name"]]);
  assertEquals(JSON.parse(calls[2].body!).values, [["a@x.io", "A"]]);
});

test("sheet-append-or-update: extraFields=ignore keeps the header row and drops unknown fields", async () => {
  const { ctx, calls } = mockCtx([
    { body: { values: [["id", "name"]] } },
    { body: { updates: { updatedRows: 1 } } },
  ]);
  await action.execute({
    spreadsheetId: "ss-1",
    sheetName: "Sheet1",
    columnToMatchOn: "id",
    rows: [{ id: "9", name: "N", extra: "x" }],
    extraFields: "ignore",
  }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(JSON.parse(calls[1].body!).values, [["9", "N"]]);
});

test("sheet-append-or-update: keys match headers ignoring case and spaces; no blank-key update", async () => {
  const { ctx, calls } = mockCtx([
    { body: { values: [["Email", "Name"], ["", "blank-key row"], ["b@x.io", "B"]] } },
    { body: { updatedRange: "Sheet1!A3" } },
  ]);
  const result = await action.execute({
    spreadsheetId: "ss-1",
    sheetName: "Sheet1",
    columnToMatchOn: "Email",
    rows: [{ " email ": "b@x.io", name: "Bee" }],
  }, ctx) as { updatedCount: number };
  assertEquals(result.updatedCount, 1);
  assertEquals(new URL(calls[1].url).pathname, "/v4/spreadsheets/ss-1/values/Sheet1!A3");
  assertEquals(JSON.parse(calls[1].body!).values, [["b@x.io", "Bee"]]);
});

test("normalizeRows: objects, one object, JSON strings; a non-object row is refused", () => {
  assertEquals(normalizeRows([{ a: 1 }]), [{ a: 1 }]);
  assertEquals(normalizeRows({ a: 1 }), [{ a: 1 }]);
  assertEquals(normalizeRows('[{"a":1},{"a":2}]'), [{ a: 1 }, { a: 2 }]);
  assertEquals(normalizeRows(['{"a":1}']), [{ a: 1 }]);
  const refused = (v: unknown) => {
    try {
      normalizeRows(v);
      return "";
    } catch (e) {
      return (e as Error).message;
    }
  };
  assertEquals(
    refused(["hello"]).startsWith('Row 1 is not an object of { header: value } (got "hello")'),
    true,
  );
  assertEquals(refused([{}]), "Row 1 is an empty object: it has no fields to write.");
  assertEquals(refused([]), "Rows is empty: there is nothing to append or update.");
});

test("columnLetter: 0 → A, 25 → Z, 26 → AA, 701 → ZZ", () => {
  assertEquals([0, 25, 26, 701].map(columnLetter), ["A", "Z", "AA", "ZZ"]);
});
