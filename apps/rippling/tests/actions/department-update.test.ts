import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import departmentUpdate from "../../actions/department-update.ts";

Deno.test("department-update: PATCHes /departments/<id>/ with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "d1", name: "Platform" } }]);
  await departmentUpdate.execute({ id: "d1", name: "Platform" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/departments/d1/");
  assertEquals(JSON.parse(calls[0].body!), { name: "Platform" });
});

Deno.test("department-update: needs an id and at least one field, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve().then(() => departmentUpdate.execute({ name: "x" }, ctx)),
    Error,
    "id is required",
  );
  await assertRejects(
    () => Promise.resolve().then(() => departmentUpdate.execute({ id: "d1" }, ctx)),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});

Deno.test("department-update: no member is required on a PATCH, and it is idempotent", () => {
  assertEquals(departmentUpdate.idempotent, true);
  assertEquals(
    departmentUpdate.params!.filter((p) => p.key !== "id").some((p) => p.required),
    false,
  );
});
