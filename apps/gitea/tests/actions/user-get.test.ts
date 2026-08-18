import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

const conn = { display: { baseUrl: "https://git.example.com" } };

Deno.test("user-get: reads the authenticated account, unparameterised", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { login: "ada" } }], conn);
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://git.example.com/api/v1/user");
  assertEquals(result.login, "ada");
  assertEquals(action.params, []);
});
