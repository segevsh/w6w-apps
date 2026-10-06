import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/record-update.ts";

const ok = {
  response: {
    result: { pkId: "100", message: "Successfully Updated" },
    message: "Data updated successfully",
    status: 0,
  },
};

Deno.test("record-update: POSTs recordId + inputData (+ tabularData) to updateRecord", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: ok }]);
  const out = await action.execute({
    formLinkName: "employee",
    recordId: "100",
    fields: { Mobile: "555" },
    tabularData: { "Work experience": [{ Jobtitle: "Dev" }] },
  }, ctx) as { pkId: string };
  assertEquals(new URL(calls[0].url).pathname, "/people/api/forms/json/employee/updateRecord");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("recordId"), "100");
  assertEquals(JSON.parse(form.get("inputData")!), { Mobile: "555" });
  assertEquals(JSON.parse(form.get("tabularData")!), { "Work experience": [{ Jobtitle: "Dev" }] });
  assertEquals(out.pkId, "100");
});

Deno.test("record-update: omits tabularData when unset; requires recordId", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: ok }]);
  await action.execute({ formLinkName: "employee", recordId: "1", fields: { a: 1 } }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).has("tabularData"), false);
  await assertRejects(
    () =>
      action.execute({ formLinkName: "employee", recordId: "", fields: { a: 1 } }, ctx) as Promise<
        unknown
      >,
    Error,
    "recordId",
  );
});

Deno.test("record-update: idempotent", () => assertEquals(action.idempotent, true));
