import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entries-import.ts";

test("entries-import: POSTs a multipart body to /forms/{formId}/import-entries", async () => {
  const { ctx, calls } = mockCtx([{ body: { Id: "imp1", Status: "Processing" } }]);
  const result = await action.execute({
    formId: "42",
    file: btoa("a,b\n1,2\n"),
    fileName: "rows.csv",
    importMode: "CreateNew",
    email: "ops@example.com",
    matchEntriesUsing: "ExternalId",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/forms/42/import-entries");
  assertEquals(calls[0].headers["content-type"], undefined);
  assert(calls[0].rawBody instanceof FormData);
  const form = calls[0].rawBody as FormData;
  assertEquals(form.get("ImportMode"), "CreateNew");
  assertEquals(form.get("Email"), "ops@example.com");
  assertEquals(form.get("MatchEntriesUsing"), "ExternalId");
  const file = form.get("File") as File;
  assertEquals(file.name, "rows.csv");
  assertEquals(result, { Id: "imp1", Status: "Processing" });
});

test("entries-import: omits optional fields when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: { Id: "imp2", Status: "Processing" } }]);
  await action.execute({ formId: "1", file: btoa("x"), importMode: "SyncEntries" }, ctx);
  const form = calls[0].rawBody as FormData;
  assertEquals(form.get("Email"), null);
  assertEquals(form.get("MatchEntriesUsing"), null);
});

test("entries-import: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
