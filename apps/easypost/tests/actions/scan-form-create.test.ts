import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/scan-form-create.ts";

const created = { status: 200, body: { id: "sf_1", form_url: "https://ep/form.pdf" } };

Deno.test("scan-form-create: wraps the shipments as id references", async () => {
  const { ctx, calls } = mockCtx([created]);
  const result = await action.execute!({ shipmentIds: "shp_1, shp_2" }, ctx) as {
    shipmentCount: number;
  };
  assertEquals(calls[0].url, "https://api.easypost.com/v2/scan_forms");
  assertEquals(JSON.parse(calls[0].body!), {
    scan_form: { shipments: [{ id: "shp_1" }, { id: "shp_2" }] },
  });
  assertEquals(result.shipmentCount, 2);
});

Deno.test("scan-form-create: needs at least one shipment", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ shipmentIds: "" }, ctx),
    Error,
    "shipmentIds",
  );
  assertEquals(calls.length, 0);
});

Deno.test("scan-form-create: logs the form and the count", async () => {
  const { ctx, logs } = mockCtx([created]);
  await action.execute!({ shipmentIds: "shp_1" }, ctx);
  assertEquals(logs[0].data, { scanFormId: "sf_1", shipmentCount: 1 });
});

/** Every shipment must be bought and share a from address. */
Deno.test("scan-form-create: states both constraints", () => {
  assert(/must be bought/.test(action.description!), action.description);
  assert(/same address/.test(action.description!), action.description);
});
