import { assertEquals } from "@std/assert";
import action from "../../actions/get-lead.ts";
import { executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("get-lead: is a read action over crm.lead", () => {
  assertEquals(action.key, "get-lead");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "crm.lead");
});

Deno.test("get-lead: read takes ids positionally, fields as a keyword", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 27 }] }]);
  await action.execute({ ids: 27, fields: "name,email_from" }, ctx);
  assertEquals(executeKwArgs(calls[0]), {
    model: "crm.lead",
    method: "read",
    args: [[27]],
    kwargs: { fields: ["name", "email_from"] },
  });
});

Deno.test("get-lead: returns records and count", async () => {
  const { ctx } = mockCtx([{ result: [{ id: 27 }] }]);
  assertEquals(await action.execute({ ids: 27 }, ctx), { records: [{ id: 27 }], count: 1 });
});
