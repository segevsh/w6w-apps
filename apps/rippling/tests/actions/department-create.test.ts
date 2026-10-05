import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import departmentCreate from "../../actions/department-create.ts";

Deno.test("department-create: POSTs /departments/ with wire-named members only", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "d1", name: "Eng" } }]);
  const out = await departmentCreate.execute(
    { name: "Eng", parentId: "d0", referenceCode: "CC-7" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/departments/");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Eng",
    parent_id: "d0",
    reference_code: "CC-7",
  });
  assertEquals(out.id, "d1");
});

Deno.test("department-create: omits unset optional members and requires a name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "d1" } }]);
  await departmentCreate.execute({ name: "Eng" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Eng" });
  await assertRejects(
    () => Promise.resolve().then(() => departmentCreate.execute({ name: " " }, ctx)),
    Error,
    "name is required",
  );
  assertEquals(calls.length, 1);
});

Deno.test("department-create: is a non-idempotent perform", () => {
  assertEquals(departmentCreate.type, "perform");
  assertEquals(departmentCreate.idempotent, false);
});
