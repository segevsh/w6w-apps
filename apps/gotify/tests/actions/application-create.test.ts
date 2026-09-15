import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/application-create.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

Deno.test("application-create: POSTs name/description/defaultPriority", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: 1, name: "Backup", token: "gtfy.abc" },
  }], conn);
  const result = await action.execute!(
    { name: "Backup", description: "nightly", defaultPriority: 5 },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "Backup", description: "nightly", defaultPriority: 5 });
  assertEquals((result as { token: string }).token, "gtfy.abc");
});

Deno.test("application-create: requires a non-empty name before any fetch", async () => {
  const { ctx, calls } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ name: "  " }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});
