import { assertEquals } from "@std/assert";
import addUnsubscribe from "../../actions/add-unsubscribe.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("add-unsubscribe: POSTs the v2 variables route with the value in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await addUnsubscribe.execute!({ value: "john.doe@example.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/v2/unsubscribes/variables/john.doe%40example.com",
  );
  assertEquals(calls[0].body, null);
});

Deno.test("add-unsubscribe: accepts a bare domain, not just an email", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await addUnsubscribe.execute!({ value: "example.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/unsubscribes/variables/example.com");
});

Deno.test("add-unsubscribe: percent-encodes a LinkedIn URL value", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await addUnsubscribe.execute!({ value: "https://www.linkedin.com/in/johndoe" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/v2/unsubscribes/variables/https%3A%2F%2Fwww.linkedin.com%2Fin%2Fjohndoe",
  );
});

Deno.test("add-unsubscribe: is idempotent — lemlist guarantees it explicitly", () => {
  assertEquals(addUnsubscribe.type, "perform");
  assertEquals(addUnsubscribe.idempotent, true);
});
