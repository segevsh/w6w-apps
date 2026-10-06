import { assertEquals } from "@std/assert";
import phoneNumberList from "../../actions/phone-number-list.ts";
import { mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { total_records: 1, limit: 20, offset: 0 };

Deno.test("phone-number-list: sends the required workspace and is_available", async () => {
  const { ctx, calls } = mockCtx([{
    body: ok({ pagination: PAGE, phone_numbers: [{ slug: "1415" }] }),
  }]);
  const out = await phoneNumberList.execute({ workspace: "w1", is_available: false }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/numbers");
  assertEquals(queryOf(calls[0].url), { workspace: "w1", is_available: "false" });
  assertEquals(out, { items: [{ slug: "1415" }], pagination: PAGE });
});
