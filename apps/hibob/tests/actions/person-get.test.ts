import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import personGet from "../../actions/person-get.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("person-get: POSTs /v1/people/{id} with the field list", async () => {
  const { ctx, calls } = mockCtx([{ body: { employees: [{ id: "321" }] } }]);
  await personGet.execute({ employeeId: "321", fields: "root.email,work.title" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/people/321");
  assertEquals(bodyOf(calls[0]), { fields: ["root.email", "work.title"] });
});

test("person-get: sends an empty body for the default field set and escapes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { employees: [] } }]);
  await personGet.execute({ employeeId: "a b/c", humanReadable: "APPEND" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/people/a%20b%2Fc");
  assertEquals(bodyOf(calls[0]), { humanReadable: "APPEND" });
});
