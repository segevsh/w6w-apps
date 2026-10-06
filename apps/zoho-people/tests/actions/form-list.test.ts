import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/form-list.ts";

Deno.test("form-list: GETs /people/api/forms and returns result + message", async () => {
  const { ctx, calls } = mockPeopleCtx([
    {
      body: {
        response: { result: [{ formLinkName: "employee" }], message: "Data fetched", status: 0 },
      },
    },
  ]);
  const out = await action.execute({}, ctx) as { result: unknown; message: string };
  assertEquals(new URL(calls[0].url).pathname, "/people/api/forms");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.result, [{ formLinkName: "employee" }]);
  assertEquals(out.message, "Data fetched");
});

Deno.test("form-list: surfaces the vendor error code", async () => {
  const { ctx } = mockPeopleCtx([
    { status: 401, body: { response: { errors: { code: 7213, message: "invalid" }, status: 1 } } },
  ]);
  await assertRejects(() => action.execute({}, ctx) as Promise<unknown>, Error, "7213");
});
