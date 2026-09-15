import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-list.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

Deno.test("message-list: defaults to /message with no applicationId", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { messages: [], paging: { size: 0, since: 0, limit: 100 } },
  }], conn);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/message");
});

Deno.test("message-list: scopes to /application/{id}/message when applicationId is set", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { messages: [], paging: { size: 0, since: 0, limit: 100 } },
  }], conn);
  await action.execute!({ applicationId: 7, limit: 25, since: 100 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/application/7/message");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("since"), "100");
});

Deno.test("message-list: returns the whole PagedMessages envelope, not just the array", async () => {
  const paging = { size: 1, since: 5, limit: 100, next: "" };
  const { ctx } = mockCtx([{ status: 200, body: { messages: [{ id: 5 }], paging } }], conn);
  const result = await action.execute!({}, ctx) as { messages: unknown[]; paging: unknown };
  assertEquals(result.messages.length, 1);
  assertEquals(result.paging, paging);
});
