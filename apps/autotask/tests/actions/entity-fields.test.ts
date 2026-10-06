import { assertEquals } from "@std/assert";
import entityFields from "../../actions/entity-fields.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://webservices2.autotask.net/atservicesrest/V1.0";
const display = { display: { zone: "2" } };
const run = (a: { execute?: unknown }, input: unknown, ctx: unknown) =>
  (a.execute as (i: unknown, c: unknown) => Promise<Record<string, unknown>>)(input, ctx);

Deno.test("entity-fields: returns required-writable names and picklists, optionally one field", async () => {
  const body = {
    fields: [
      { name: "id", isRequired: true, isReadOnly: true, isPickList: false },
      { name: "title", isRequired: true, isReadOnly: false, isPickList: false },
      {
        name: "status",
        isRequired: true,
        isReadOnly: false,
        isPickList: true,
        picklistValues: [{ value: "1", label: "New", isActive: true, sortOrder: 1 }],
      },
    ],
  };
  const all = mockCtx([{ body }], display);
  const out = await run(entityFields, { entity: "Tickets" }, all.ctx);
  assertEquals(all.calls[0].url, `${BASE}/Tickets/entityInformation/fields`);
  assertEquals(out.requiredOnCreate, ["title", "status"]);
  assertEquals(out.picklists, { status: [{ value: "1", label: "New", isActive: true }] });

  const one = mockCtx([{ body }], display);
  const only = await run(entityFields, { entity: "Tickets", field: "STATUS" }, one.ctx);
  assertEquals((only.fields as unknown[]).length, 1);
});
