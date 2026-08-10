import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import createEntry from "../../actions/create-entry.ts";

Deno.test("create-entry: POSTs all three required data fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: { entry_id: "e1" } } } }]);
  await createEntry.execute({
    list: "sales",
    parentObject: "companies",
    parentRecordId: "r1",
    entryValues: { stage: "Lead" },
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.attio.com/v2/lists/sales/entries");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      parent_object: "companies",
      parent_record_id: "r1",
      entry_values: { stage: "Lead" },
    },
  });
});

/**
 * `entry_values` is `required` in the schema, so an omitted one must become an
 * empty object rather than a missing key — a list with no attributes of its own
 * is the common case.
 */
Deno.test("create-entry: sends an empty entry_values rather than omitting the required key", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }]);
  await createEntry.execute({ list: "sales", parentObject: "people", parentRecordId: "r1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).data.entry_values, {});
});

/** Attio explicitly permits duplicate entries, so this action cannot claim idempotence. */
Deno.test("create-entry: is declared non-idempotent and says a repeat creates a duplicate", () => {
  assertEquals(createEntry.idempotent, false);
  const d = createEntry.description!;
  assert(/two entries|duplicat/i.test(d), d);
  assert(d.includes("Upsert Entry"), d);
});
