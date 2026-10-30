import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/employee-fields.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

test("employee-fields: GETs /resource/Employee/INFO", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { fields: [{ name: "FirstName", type: "string" }] } }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Employee/INFO`);
  assertEquals(out, { response: { fields: [{ name: "FirstName", type: "string" }] } });
});
