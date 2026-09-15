import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/application-list.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

Deno.test("application-list: GETs /application and returns the array", async () => {
  const apps = [{ id: 1, name: "Backup", token: "", internal: false }];
  const { ctx, calls } = mockCtx([{ status: 200, body: apps }], conn);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/application");
  assertEquals(result, apps);
});
