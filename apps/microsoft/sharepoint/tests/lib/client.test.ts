import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import {
  childPath,
  compact,
  drivePath,
  encodeItemPath,
  itemPath,
  listItemPath,
  listPath,
  odataList,
  requireItemPath,
  sitePath,
} from "../../lib/client.ts";

// -------------------------------------------------------------- sitePath --

test("sitePath: no addressing means the tenant root site", () => {
  assertEquals(sitePath({}), "/sites/root");
  assertEquals(sitePath(), "/sites/root");
});

test("sitePath: by Site ID, a comma-joined compound value stays one segment", () => {
  assertEquals(
    sitePath({ siteId: "contoso.sharepoint.com,2C71,2D22" }),
    "/sites/contoso.sharepoint.com%2C2C71%2C2D22",
  );
});

test("sitePath: by Hostname alone", () => {
  assertEquals(sitePath({ hostname: "contoso.sharepoint.com" }), "/sites/contoso.sharepoint.com");
});

test("sitePath: Hostname + Path uses the structural colon form", () => {
  assertEquals(
    sitePath({ hostname: "contoso.sharepoint.com", path: "teams/hr" }),
    "/sites/contoso.sharepoint.com:/teams/hr",
  );
});

test("sitePath: Site ID and Hostname together is an error", () => {
  assertThrows(
    () => sitePath({ siteId: "x", hostname: "contoso.sharepoint.com" }),
    Error,
    "not both",
  );
});

test("sitePath: Path without Hostname is an error", () => {
  assertThrows(() => sitePath({ path: "teams/hr" }), Error, "Hostname");
});

// ------------------------------------------------------------- drivePath --

test("drivePath: no Drive ID means the addressed site's default library", () => {
  assertEquals(drivePath({}), "/sites/root/drive");
  assertEquals(
    drivePath({ hostname: "contoso.sharepoint.com" }),
    "/sites/contoso.sharepoint.com/drive",
  );
});

test("drivePath: a Drive ID bypasses site addressing entirely", () => {
  assertEquals(drivePath({ driveId: "b!abc", siteId: "ignored" }), "/drives/b!abc");
});

// -------------------------------------------------------------- itemPath --

test("itemPath: Item ID under the resolved drive", () => {
  assertEquals(
    itemPath({ itemId: "ITEM1" }, "/children"),
    "/sites/root/drive/items/ITEM1/children",
  );
});

test("itemPath: Item path uses the structural colon form, only when a suffix follows", () => {
  assertEquals(
    itemPath({ itemPath: "Reports/Q3.pdf" }, "/permissions"),
    "/sites/root/drive/root:/Reports/Q3.pdf:/permissions",
  );
  assertEquals(itemPath({ itemPath: "Reports/Q3.pdf" }), "/sites/root/drive/root:/Reports/Q3.pdf");
});

test("itemPath: neither Item ID nor Item path addresses the drive root", () => {
  assertEquals(itemPath({}, "/children"), "/sites/root/drive/root/children");
});

test("itemPath: Item ID and Item path together is an error", () => {
  assertThrows(() => itemPath({ itemId: "A", itemPath: "B" }), Error, "not both");
});

test("requireItemPath: neither addressing form set is a legible error, not the root", () => {
  assertThrows(() => requireItemPath({}), Error, "must be addressed");
});

test("itemPath: item id resolves through a Drive ID override, not the site", () => {
  assertEquals(
    itemPath({ driveId: "b!abc", itemId: "ITEM1", siteId: "ignored" }),
    "/drives/b!abc/items/ITEM1",
  );
});

// -------------------------------------------------------------- childPath --

test("childPath: names a new child under an Item ID parent", () => {
  assertEquals(
    childPath({ itemId: "PARENT" }, "notes.txt", "/content"),
    "/sites/root/drive/items/PARENT:/notes.txt:/content",
  );
});

test("childPath: names a new child under an Item path parent", () => {
  assertEquals(
    childPath({ itemPath: "Reports" }, "notes.txt", "/content"),
    "/sites/root/drive/root:/Reports/notes.txt:/content",
  );
});

test("childPath: no parent addressed means directly under the drive root", () => {
  assertEquals(
    childPath({}, "notes.txt", "/content"),
    "/sites/root/drive/root:/notes.txt:/content",
  );
});

test("childPath: rejects a `/` in the file name rather than encoding it", () => {
  assertThrows(() => childPath({}, "a/b.txt"), Error, "must not contain");
});

test("childPath: empty file name is rejected", () => {
  assertThrows(() => childPath({}, "   "), Error, "empty");
});

// -------------------------------------------------------------- list*Path --

test("listPath: joins the site path and the list id", () => {
  assertEquals(listPath({ listId: "L1" }), "/sites/root/lists/L1");
  assertEquals(
    listPath({ hostname: "contoso.sharepoint.com", listId: "L1" }, "/items"),
    "/sites/contoso.sharepoint.com/lists/L1/items",
  );
});

test("listPath: missing List ID is a legible error", () => {
  assertThrows(() => listPath({ listId: "" }), Error, "List ID");
});

test("listItemPath: joins the list path and the item id", () => {
  assertEquals(
    listItemPath({ listId: "L1", itemId: "42" }, "/fields"),
    "/sites/root/lists/L1/items/42/fields",
  );
});

test("listItemPath: missing Item ID is a legible error", () => {
  assertThrows(() => listItemPath({ listId: "L1", itemId: "" }), Error, "Item ID");
});

// -------------------------------------------------------------- encoding --

test("encodeItemPath: percent-encodes each segment but keeps `/` as a separator", () => {
  assertEquals(encodeItemPath("Reports/Q3 2026.pdf"), "Reports/Q3%202026.pdf");
});

test("encodeItemPath: drops empty segments from stray slashes", () => {
  assertEquals(encodeItemPath("/Reports//Q3.pdf/"), "Reports/Q3.pdf");
});

// ---------------------------------------------------------------- helpers --

test("odataList: joins and trims, empty input yields undefined", () => {
  assertEquals(odataList(["Title", " Author "]), "Title,Author");
  assertEquals(odataList([]), undefined);
  assertEquals(odataList(undefined), undefined);
});

test("compact: drops only undefined entries", () => {
  assertEquals(compact({ a: 1, b: undefined, c: 0, d: null }), { a: 1, c: 0, d: null });
});
