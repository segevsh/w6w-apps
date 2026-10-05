import { assertEquals, assertRejects } from "@std/assert";
import customerAddressList from "../../actions/customer-address-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "customerId": 1337 };
const RESPONSE = [{ "id": 1 }];

Deno.test("customer-address-list: sends GET /v1/customers/1337/addresses with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await customerAddressList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/customers/1337/addresses");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("customer-address-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await customerAddressList.execute(INPUT, ctx), { "data": [{ "id": 1 }] });
});

Deno.test("customer-address-list: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(customerAddressList.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("customer-address-list: a non-integer customerId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        customerAddressList.execute({ ...INPUT, customerId: "1/../2" as unknown as number }, ctx),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
