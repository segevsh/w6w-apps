import { assertEquals } from "@std/assert";
import callList from "../../actions/call-list.ts";
import { mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { total_records: 1, limit: 20, offset: 0 };

Deno.test("call-list: GET /calls with every filter named as the vendor names it", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ pagination: PAGE, calls: [{ call_id: "c1" }] }) }]);
  const out = await callList.execute(
    {
      model_id: "m1",
      limit: 10,
      offset: 0,
      from_date: 1700000000000,
      to_date: 1700000001000,
      call_status: "completed",
      duration_min: 5,
      duration_max: 60,
      lead_phone_number: "+14155551234",
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v2/calls");
  assertEquals(queryOf(calls[0].url), {
    model_id: "m1",
    limit: "10",
    offset: "0",
    from_date: "1700000000000",
    to_date: "1700000001000",
    call_status: "completed",
    duration_min: "5",
    duration_max: "60",
    lead_phone_number: "+14155551234",
  });
  assertEquals(out, { items: [{ call_id: "c1" }], pagination: PAGE });
});
