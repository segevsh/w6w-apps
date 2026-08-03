import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import upsertRecord from "../../actions/upsert-record.ts";

Deno.test("upsert-record: PUTs with matching_attribute on the QUERY string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: { record_id: "r1" } } } }]);
  await upsertRecord.execute({
    object: "companies",
    matchingAttribute: "domains",
    values: { domains: ["attio.com"], name: "Attio" },
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/objects/companies/records");
  assertEquals(url.searchParams.get("matching_attribute"), "domains");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { values: { domains: ["attio.com"], name: "Attio" } },
  });
});

Deno.test("upsert-record: is idempotent and says why it is the integration default", () => {
  assertEquals(upsertRecord.idempotent, true);
  const d = upsertRecord.description!;
  assert(/lead intake|sync/i.test(d), d);
  // The asymmetry nobody reads in the docs.
  assert(/ADDED/.test(d), d);
});
