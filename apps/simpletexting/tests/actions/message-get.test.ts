import { assertEquals, assertRejects } from "@std/assert";
import messageGet from "../../actions/message-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

const MESSAGE = {
  id: "507f191e810c19729de860ea",
  text: "Hello! How are you?",
  contactPhone: "8001234567",
  accountPhone: "8005551234",
  directionType: "MO",
  category: "SMS",
  timestamp: "2020-04-28T23:20:08.489Z",
};

Deno.test("message-get: reads one message by id", async () => {
  const { ctx, calls } = mockCtx([{ body: MESSAGE }]);
  const result = await messageGet.execute({ messageId: MESSAGE.id }, ctx) as { id: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/messages/${MESSAGE.id}`);
  assertEquals(result.id, MESSAGE.id);
});

/**
 * The id is a path segment, and the client escapes it as one — an id pasted with
 * a slash or a query character in it must fail as a 404, not silently address a
 * different path.
 */
Deno.test("message-get: escapes the id as a single path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: MESSAGE }]);
  await messageGet.execute({ messageId: " 507f/../admin " }, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/api/messages/507f%2F..%2Fadmin`);
});

Deno.test("message-get: a missing id surfaces the vendor's status", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: { status: "NOT_FOUND", errorCode: "ERR_MESSAGE_NOT_FOUND", message: "no such message" },
    },
  ]);
  await assertRejects(
    async () => await messageGet.execute({ messageId: "abc" }, ctx),
    Error,
    "404",
  );
});

Deno.test("message-get: declares the fields a Message actually carries", () => {
  const output = messageGet.output;
  const keys = (Array.isArray(output) ? output : []).map((o) => o.key);
  for (const key of ["id", "text", "directionType", "category", "timestamp", "mediaItems"]) {
    assertEquals(keys.includes(key), true, `${key} missing from output`);
  }
});
