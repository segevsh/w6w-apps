import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-group.ts";

Deno.test("create-group: POSTs /api/groups with the name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "1", name: "News" } } }]);
  const out = await action.execute!({ name: "News" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/groups");
  assertEquals(JSON.parse(calls[0].body!), { name: "News" });
  assertEquals(out, { data: { id: "1", name: "News" } });
});

Deno.test("create-group: is NOT idempotent — MailerLite does not dedupe on name", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("create-group: caps the name at MailerLite's 255-character limit", () => {
  const name = action.params!.find((p) => p.key === "name")!;
  assertEquals(name.required, true);
  assertEquals(name.validation?.maxLength, 255);
});
