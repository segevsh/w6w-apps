import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import updateEntry from "../../actions/update-entry.ts";

Deno.test("update-entry: append is PATCH, overwrite is PUT, on the entry url", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: {} } },
    { status: 200, body: { data: {} } },
  ]);
  const base = { list: "sales", entryId: "e1", entryValues: { stage: "Won" } };
  await updateEntry.execute({ ...base, multiselect: "append" }, ctx);
  await updateEntry.execute({ ...base, multiselect: "overwrite" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[1].method, "PUT");
  assertEquals(calls[0].url, "https://api.attio.com/v2/lists/sales/entries/e1");
  assertEquals(JSON.parse(calls[0].body!), { data: { entry_values: { stage: "Won" } } });
});

Deno.test("update-entry: says the parent record cannot be changed here", () => {
  assert(/parent record cannot be changed/i.test(updateEntry.description!));
});
