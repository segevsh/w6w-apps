import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/department-create.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("department-create: posts the title", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "d1" } }], conn);
  await action.execute!({ title: "Customer Support" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { title: "Customer Support" });
});

Deno.test("department-create: a missing title is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "title");
});

/** Titles are not unique, so re-running makes a second department. */
Deno.test("department-create: declares itself non-idempotent, and says why", () => {
  assertEquals(action.idempotent, false);
  assert(/not unique/i.test(action.description!), action.description);
});
