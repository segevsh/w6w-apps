import { assert, assertEquals } from "@std/assert";
import { mockCtx, param, run } from "../_helpers.ts";
import listRecords from "../../actions/list-records.ts";

const env = { active_from: "2023-04-03T15:21:06.447000000Z", active_until: null };

Deno.test("list-records: POSTs to …/records/query with filter, sorts and paging in the BODY", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listRecords.execute({
    object: "people",
    filter: { name: "Ada Lovelace" },
    sorts: [{ direction: "asc", attribute: "name", field: "last_name" }],
    limit: 50,
    offset: 50,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.attio.com/v2/objects/people/records/query");
  // Pagination lives in the body on this endpoint, not the query string.
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body!), {
    filter: { name: "Ada Lovelace" },
    sorts: [{ direction: "asc", attribute: "name", field: "last_name" }],
    limit: 50,
    offset: 50,
  });
});

Deno.test("list-records: works on a custom object slug, not just the standard five", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listRecords.execute({ object: "vendors" }, ctx);
  assertEquals(calls[0].url, "https://api.attio.com/v2/objects/vendors/records/query");
  // Nothing is sent that the user did not ask for.
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("list-records: url-encodes an object identifier", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listRecords.execute({ object: "a/b" }, ctx);
  assertEquals(calls[0].url, "https://api.attio.com/v2/objects/a%2Fb/records/query");
});

Deno.test("list-records: emits both raw records and a flattened view", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: [{
        id: { record_id: "r1" },
        values: {
          name: [{ ...env, attribute_type: "personal-name", full_name: "Ada Lovelace" }],
          email_addresses: [
            { ...env, attribute_type: "email-address", email_address: "ada@x.com" },
          ],
        },
      }],
    },
  }]);
  const out = await run<{
    records: Array<Record<string, unknown>>;
    records_flat: Array<{ values_flat: Record<string, unknown> }>;
  }>(listRecords, { object: "people" }, ctx);

  // Raw stays raw — the envelope and the un-normalised fields are still there.
  assert(Array.isArray((out.records[0].values as Record<string, unknown>).name));
  assertEquals(out.records_flat[0].values_flat, {
    name: "Ada Lovelace",
    email_addresses: "ada@x.com",
  });
});

Deno.test("list-records: names the missing-$ne rule, which has no workaround but $not", () => {
  const hint = param(listRecords, "filter").hint!;
  assert(hint.includes("$not"), hint);
  assert(/no `\$ne`/.test(hint), hint);
});

Deno.test("list-records: flags that filter and filterViewId are mutually exclusive", () => {
  assert(/[Mm]utually exclusive/.test(param(listRecords, "filterViewId").hint!));
  assert(/[Cc]annot be combined/.test(param(listRecords, "filter").hint!));
});
