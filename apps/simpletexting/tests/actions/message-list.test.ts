import { assertEquals } from "@std/assert";
import messageList from "../../actions/message-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

const MESSAGES = [
  {
    id: "507f191e810c19729de860ea",
    text: "Hi",
    contactPhone: "8001234567",
    accountPhone: "8005551234",
    directionType: "MT",
    category: "SMS",
    timestamp: "2020-04-28T23:20:08.489Z",
  },
];

Deno.test("message-list: reads the messages page and returns its rows", async () => {
  const { ctx, calls } = mockCtx([{ body: page(MESSAGES, { totalElements: 1 }) }]);
  const result = await messageList.execute({}, ctx) as {
    content: unknown[];
    totalElements: number;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/messages`);
  assertEquals(result.content, MESSAGES);
  assertEquals(result.totalElements, 1);
});

Deno.test("message-list: every documented filter is forwarded, blank ones are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: page(MESSAGES) }]);
  await messageList.execute(
    {
      page: 2,
      size: 100,
      accountPhone: "8005551234",
      contactPhone: "8001234567",
      since: "2021-04-28T23:20:08.489Z",
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    page: "2",
    size: "100",
    accountPhone: "8005551234",
    contactPhone: "8001234567",
    since: "2021-04-28T23:20:08.489Z",
  });

  const blank = mockCtx([{ body: page(MESSAGES) }]);
  await messageList.execute({ accountPhone: "", contactPhone: "", since: "" }, blank.ctx);
  assertEquals(queryOf(blank.calls[0].url), {});
});

/**
 * `accountPhone` is a filter with a default the vendor's own text spells out:
 * blank means only the primary account number's messages come back. A secondary
 * sender's traffic is invisible unless the number is passed.
 */
Deno.test("message-list: documents that a blank accountPhone means the primary number only", () => {
  const hint = messageList.params!.find((p) => p.key === "accountPhone")?.hint ?? "";
  assertEquals(hint.includes("primary"), true);
});

Deno.test("message-list: is a search action, so a host may treat it as a read", () => {
  assertEquals(messageList.type, "search");
  assertEquals(messageList.idempotent, undefined);
});
