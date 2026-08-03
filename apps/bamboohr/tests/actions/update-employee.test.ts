import { assert, assertEquals } from "@std/assert";
import updateEmployee from "../../actions/update-employee.ts";
import { mockCtx, param } from "../_helpers.ts";

Deno.test("update-employee: POSTs to /employees/{id} — not PUT or PATCH", async () => {
  assertEquals(updateEmployee.type, "perform");
  // BambooHR updates with POST. Using PUT/PATCH here would 404 or 405.
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await updateEmployee.execute({ id: "42", jobTitle: "Staff Engineer" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/42");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { jobTitle: "Staff Engineer" });
  assertEquals(out, { status: 200 });
});

Deno.test("update-employee: is idempotent — the same fields twice is a no-op", () => {
  assertEquals(updateEmployee.idempotent, true);
});

Deno.test("update-employee: only the supplied fields are sent, so nothing is blanked", async () => {
  // The update is a merge. Sending `undefined` keys as null would wipe stored
  // values the caller never mentioned.
  const { ctx, calls } = mockCtx([{ body: "" }]);
  await updateEmployee.execute({ id: "1", firstName: "Ava" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { firstName: "Ava" });
});

Deno.test("update-employee: an explicit empty string survives, to clear a field", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  await updateEmployee.execute({ id: "1", workEmail: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { workEmail: "" });
});

Deno.test("update-employee: id is the only required param and is escaped", async () => {
  const required = (updateEmployee.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["id"]);
  const { ctx, calls } = mockCtx([{ body: "" }]);
  await updateEmployee.execute({ id: "a/b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/a%2Fb");
});

Deno.test("update-employee: names the correct address aliases, which are a 406 trap", () => {
  // `homeCity` etc. do not exist; the docs call each one out individually.
  const hint = param(updateEmployee, "fields").hint ?? "";
  assert(/address1/.test(hint) && /zipcode/.test(hint));
  assert(/406|home\*|do not exist/i.test(hint));
});
