import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-list.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

test("client-list: GETs /client and returns the array", async () => {
  const clients = [{ id: 1, name: "Phone", token: "" }];
  const { ctx, calls } = mockCtx([{ status: 200, body: clients }], conn);
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/client");
  assertEquals(result, clients);
});
