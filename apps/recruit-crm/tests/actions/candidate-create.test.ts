import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/candidate-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("candidate-create: POSTs multipart/form-data with the vendor's field names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { first_name: "Ada" } }]);
  const out = await action.execute({
    firstName: "Ada",
    lastName: "Lovelace",
    workExYear: 7,
    currentSalary: 0,
    city: "",
  }, ctx);
  assertEquals(out, { first_name: "Ada" });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/candidates");
  const type = calls[0].headers["content-type"];
  assert(type.startsWith("multipart/form-data; boundary="));
  const boundary = type.split("boundary=")[1];
  const body = calls[0].body!;
  assert(body.includes('name="first_name"\r\n\r\nAda\r\n'));
  assert(body.includes('name="work_ex_year"\r\n\r\n7\r\n'));
  assert(body.includes('name="current_salary"\r\n\r\n0\r\n'), "zero is a value, not unset");
  assert(!body.includes('name="city"'), "an empty field is not sent");
  assert(body.endsWith(`--${boundary}--\r\n`));
  assertEquals(calls[0].headers.authorization, undefined, "credentials belong to sign only");
});

Deno.test("candidate-create: refuses an empty form without calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await (action.execute({}, ctx)), Error, "at least one");
  assertEquals(calls.length, 0);
});

Deno.test("candidate-create: is declared non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
