import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import upsertEntry from "../../actions/upsert-entry.ts";

Deno.test("upsert-entry: PUTs to the collection url, matching on the parent record", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: { entry_id: "e1" } } } }]);
  await upsertEntry.execute({
    list: "sales",
    parentObject: "companies",
    parentRecordId: "r1",
    entryValues: { stage: "Lead" },
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  // The collection url, NOT …/entries/{entry_id} — there is no entry id to give.
  assertEquals(calls[0].url, "https://api.attio.com/v2/lists/sales/entries");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      parent_object: "companies",
      parent_record_id: "r1",
      entry_values: { stage: "Lead" },
    },
  });
});

Deno.test("upsert-entry: has no matching-attribute param — the parent record IS the key", () => {
  const keys = (upsertEntry.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("matchingAttribute"), false);
  assert(/match key/i.test(param(upsertEntry, "parentRecordId").hint!));
});

/**
 * Multiselect handling is fixed to overwrite on this endpoint and choosable on
 * Update Entry. Saying so on the param is the only place a user would find out.
 */
Deno.test("upsert-entry: states that multiselects are always overwritten here", () => {
  assert(/always overwritten/i.test(param(upsertEntry, "entryValues").hint!));
  assert(/MULTIPLE_MATCH_RESULTS/.test(upsertEntry.description!));
});

Deno.test("upsert-entry: rejects a doubly-wrapped payload before sending", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      upsertEntry.execute({
        list: "sales",
        parentObject: "people",
        parentRecordId: "r1",
        entryValues: { entry_values: { stage: "Lead" } },
      }, ctx) as Promise<unknown>,
    Error,
    "doubly wrapped",
  );
  assertEquals(calls.length, 0);
});
