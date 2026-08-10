import { assert, assertEquals } from "@std/assert";
import { mockCtx, param, run } from "../_helpers.ts";
import listEntries from "../../actions/list-entries.ts";

const env = { active_from: "2023-04-03T15:21:06.447000000Z", active_until: null };

Deno.test("list-entries: POSTs to …/entries/query with filter and paging in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listEntries.execute({
    list: "sales",
    filter: { stage: "In Progress" },
    limit: 25,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.attio.com/v2/lists/sales/entries/query");
  assertEquals(JSON.parse(calls[0].body!), { filter: { stage: "In Progress" }, limit: 25 });
});

Deno.test("list-entries: passes a parent_record path filter through untouched", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  const pathFilter = {
    path: [["candidates", "parent_record"], ["people", "email_addresses"]],
    constraints: { email_domain: "apple.com" },
  };
  await listEntries.execute({ list: "candidates", filter: pathFilter }, ctx);
  assertEquals(JSON.parse(calls[0].body!).filter, pathFilter);
});

Deno.test("list-entries: flattens entry_values, not values", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: [{
        id: { entry_id: "e1" },
        entry_values: { stage: [{ ...env, attribute_type: "status", status: { title: "Won" } }] },
      }],
    },
  }]);
  const out = await run<{ records_flat: Array<{ values_flat: Record<string, unknown> }> }>(
    listEntries,
    { list: "sales" },
    ctx,
  );
  assertEquals(out.records_flat[0].values_flat, { stage: "Won" });
});

Deno.test("list-entries: documents the parent_record drill-down, which is its reason to exist", () => {
  assert(/parent_record/.test(param(listEntries, "filter").hint!));
  assert(/parent_record/.test(listEntries.description!));
});
