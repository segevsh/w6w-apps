import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/employee-create.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

test("employee-create: POSTs the Employee body to /resource/Employee", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { Id: 9, FirstName: "Ada", LastName: "Lovelace" } }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({ firstName: "Ada", lastName: "Lovelace" }, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Employee`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { FirstName: "Ada", LastName: "Lovelace" });
  assertEquals(out, { Id: 9, FirstName: "Ada", LastName: "Lovelace" });
});

test("employee-create: is not idempotent — Deputy documents no create dedup key", () => {
  assertEquals(action.idempotent, false);
});

test("employee-create: firstName and lastName are required", () => {
  const byKey = Object.fromEntries(action.params!.map((p) => [p.key, p]));
  assertEquals(byKey.firstName.required, true);
  assertEquals(byKey.lastName.required, true);
});
