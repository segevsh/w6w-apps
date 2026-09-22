import { assertEquals } from "@std/assert";
import { mockBiginCtx, recordResult } from "../_helpers.ts";
import action from "../../actions/company-update.ts";

Deno.test("company-update: PUTs to the record path with the id in the documented body", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: recordResult("42") }]);
  await action.execute({ recordId: "42", fields: { Website: "https://acme.example" } }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/bigin/v2/Accounts/42");
  assertEquals(JSON.parse(calls[0].body ?? ""), {
    data: [{ id: "42", Website: "https://acme.example" }],
  });
});
