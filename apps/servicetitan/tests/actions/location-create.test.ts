import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/location-create.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("location-create: POSTs customerId, name and nested address", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 3 } }], conn);
  await action.execute!(
    {
      customerId: 9,
      name: "Cabin",
      street: "2 Elm",
      city: "Reno",
      state: "NV",
      zip: "89501",
      country: "USA",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.servicetitan.io/crm/v2/tenant/42/locations");
  assertEquals(JSON.parse(calls[0].body!), {
    customerId: 9,
    name: "Cabin",
    address: { street: "2 Elm", city: "Reno", state: "NV", zip: "89501", country: "USA" },
  });
  assertEquals(action.idempotent, false);
});
