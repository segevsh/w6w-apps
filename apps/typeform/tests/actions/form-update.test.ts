import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-update.ts";

Deno.test("form-update: PUTs the full form body to /forms/{id}", async () => {
  const form = { title: "Renamed", fields: [{ title: "Q", type: "yes_no" }] };
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "abc", title: "Renamed" } }]);
  await action.execute({ formId: "abc", form }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/forms/abc");
  assertEquals(JSON.parse(calls[0].body!), form);
});
