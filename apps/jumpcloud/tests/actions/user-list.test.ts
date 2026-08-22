import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

const display = { display: { region: "us" } };

Deno.test("user-list: reads the V1 systemusers collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ _id: "u1" }] } }], display);
  const result = await action.execute!({ limit: 5 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/systemusers");
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "5");
  assertEquals(result, [{ _id: "u1" }]);
});

/** JumpCloud's sort and fields are space-separated; the form is comma-separated. */
Deno.test("user-list: sort and fields are converted to spaces, filter is passed as given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], display);
  await action.execute!({
    filter: "department:$eq:Engineering",
    sort: "lastname, -created",
    fields: "email, username",
    search: "ada",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("filter"), "department:$eq:Engineering");
  assertEquals(q.get("sort"), "lastname -created");
  assertEquals(q.get("fields"), "email username");
  assertEquals(q.get("search"), "ada");
});

Deno.test("user-list: the connection's region decides the host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], {
    display: { region: "eu" },
  });
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).host, "console.eu.jumpcloud.com");
});
