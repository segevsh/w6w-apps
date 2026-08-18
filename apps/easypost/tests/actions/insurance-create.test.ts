import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/insurance-create.ts";

const created = { status: 200, body: { id: "ins_1", status: "purchased" } };
const addr = '{"street1":"1 Main St","zip":"90277"}';

Deno.test("insurance-create: posts a wrapped policy with both addresses", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!({
    trackingCode: "1Z999",
    amount: 250,
    toAddress: addr,
    fromAddress: "adr_home",
  }, ctx);
  assertEquals(calls[0].url, "https://api.easypost.com/v2/insurances");
  const body = JSON.parse(calls[0].body!).insurance;
  assertEquals(body.tracking_code, "1Z999");
  assertEquals(body.amount, "250");
  assertEquals(body.to_address.zip, "90277");
  assertEquals(body.from_address, { id: "adr_home" });
});

Deno.test("insurance-create: a zero or missing value is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!(
        { trackingCode: "1Z999", amount: 0, toAddress: addr, fromAddress: addr },
        ctx,
      ),
    Error,
    "pays out against",
  );
  assertEquals(calls.length, 0);
});

Deno.test("insurance-create: needs a tracking number and both addresses", async () => {
  const base = { trackingCode: "1Z999", amount: 10, toAddress: addr, fromAddress: addr };
  for (const missing of ["trackingCode", "toAddress", "fromAddress"]) {
    const input = { ...base, [missing]: "" };
    const { ctx, calls } = mockCtx();
    await assertRejects(async () => await action.execute!(input, ctx), Error, missing);
    assertEquals(calls.length, 0);
  }
});

Deno.test("insurance-create: logs the policy, not the parcel's owner", async () => {
  const { ctx, logs } = mockCtx([created]);
  await action.execute!({
    trackingCode: "1Z999",
    amount: 250,
    toAddress: addr,
    fromAddress: addr,
  }, ctx);
  assertEquals(logs[0].data, { insuranceId: "ins_1", status: "purchased" });
});

/** "Insure it after it goes missing" is not a workflow. */
Deno.test("insurance-create: says the window closes", () => {
  assert(/cannot be insured retroactively/.test(action.description!), action.description);
});
