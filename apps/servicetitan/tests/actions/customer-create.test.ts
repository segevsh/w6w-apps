import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

const address = { street: "1 Main", city: "Glendale", state: "CA", zip: "91201", country: "USA" };

Deno.test("customer-create: POSTs name, bill-to address, one location and contacts", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 5, name: "Ann" } }], conn);
  await action.execute!(
    {
      name: "Ann",
      type: "Residential",
      ...address,
      phone: "555-1",
      email: "a@b.com",
      tagTypeIds: "3,4",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.servicetitan.io/crm/v2/tenant/42/customers");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Ann");
  assertEquals(body.type, "Residential");
  assertEquals(body.address, address);
  assertEquals(body.locations, [{ name: "Ann", address }]);
  assertEquals(body.contacts, [
    { type: "Phone", value: "555-1" },
    { type: "Email", value: "a@b.com" },
  ]);
  assertEquals(body.tagTypeIds, [3, 4]);
});

Deno.test("customer-create: location name overrides, contacts are omitted when none given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 5 } }], conn);
  await action.execute!({ name: "Ann", ...address, locationName: "Home" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.locations[0].name, "Home");
  assertEquals("contacts" in body, false);
  assertEquals(action.idempotent, false);
});
