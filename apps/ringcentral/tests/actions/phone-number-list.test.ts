import { assertEquals } from "@std/assert";
import phoneNumberList from "../../actions/phone-number-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("phone-number-list: hits the account-level phone-number collection", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ phoneNumber: "+15550000000" }]) }]);
  const out = await phoneNumberList.execute({}, ctx) as { records: unknown[] };

  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/~/phone-number");
  assertEquals(out.records.length, 1);
});

Deno.test("phone-number-list: usageType repeats the query key, status is single-valued", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await phoneNumberList.execute(
    { usageType: ["MainCompanyNumber", "DirectNumber"], status: "Normal" },
    ctx,
  );
  assertEquals(queryAllOf(calls[0].url, "usageType"), ["MainCompanyNumber", "DirectNumber"]);
  assertEquals(queryOf(calls[0].url).status, "Normal");
});
