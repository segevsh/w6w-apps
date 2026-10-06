import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/record-create.ts";

const ok = {
  response: {
    result: { pkId: "100", message: "Successfully Added" },
    message: "Data added successfully",
    status: 0,
  },
};

Deno.test("record-create: POSTs inputData as a urlencoded JSON string", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: ok }]);
  const out = await action.execute({
    formLinkName: "employee",
    fields: { FirstName: "Ada" },
    isDraft: false,
  }, ctx) as { pkId: string; message: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/people/api/forms/json/employee/insertRecord");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(JSON.parse(form.get("inputData")!), { FirstName: "Ada" });
  assertEquals(form.get("isDraft"), "false");
  assertEquals(out.pkId, "100");
});

Deno.test("record-create: accepts fields as a JSON string and rejects non-objects", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: ok }]);
  await action.execute({ formLinkName: "leave", fields: '{"a":"b"}' }, ctx);
  assertEquals(JSON.parse(new URLSearchParams(calls[0].body!).get("inputData")!), { a: "b" });
  await assertRejects(
    () => action.execute({ formLinkName: "leave", fields: "[1]" }, ctx) as Promise<unknown>,
    Error,
    "JSON object",
  );
});

Deno.test("record-create: mandatory-field failure (7052) is thrown even inside a 2xx", async () => {
  const { ctx } = mockPeopleCtx([{
    body: { response: { errors: { code: 7052, message: "Invalid value/mandatory" }, status: 1 } },
  }]);
  await assertRejects(
    () => action.execute({ formLinkName: "employee", fields: {} }, ctx) as Promise<unknown>,
    Error,
    "7052",
  );
});

Deno.test("record-create: not idempotent", () => assertEquals(action.idempotent, false));
