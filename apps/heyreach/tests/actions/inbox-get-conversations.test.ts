import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/inbox-get-conversations.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/inbox/GetConversationsV3";

Deno.test("inbox-get-conversations: POSTs the limit and an (empty) filter object", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { items: [], totalCount: 0, nextCursor: null, hasNextPage: false },
  }]);
  await action.execute!({ limit: 10 }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { limit: 10, filters: {} });
});

Deno.test("inbox-get-conversations: the cursor is a body field, not an offset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ limit: 10, cursor: "opaque-token" }, ctx);
  const body = jsonBody(calls[0]);
  assertEquals(body.cursor, "opaque-token");
  assertEquals("offset" in body, false);
});

/** `seen: false` means "unread only" and must survive compaction. */
Deno.test("inbox-get-conversations: seen=false is sent, and unset means null/both", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }, { status: 200, body: {} }]);
  await action.execute!({ limit: 10, seen: false }, ctx);
  await action.execute!({ limit: 10 }, ctx);
  assertEquals(
    (jsonBody(calls[0]).filters as Record<string, unknown>).seen,
    false,
  );
  assertEquals("seen" in (jsonBody(calls[1]).filters as Record<string, unknown>), false);
});

Deno.test("inbox-get-conversations: filters and the window are passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    limit: 25,
    from: "2026-09-01T00:00:00.000Z",
    linkedInAccountIds: [3],
    campaignIds: "5,6",
    searchString: "hello",
    tags: ["customer"],
    seen: true,
  }, ctx);
  assertEquals(jsonBody(calls[0]), {
    limit: 25,
    from: "2026-09-01T00:00:00.000Z",
    filters: {
      linkedInAccountIds: [3],
      campaignIds: [5, 6],
      searchString: "hello",
      tags: ["customer"],
      seen: true,
    },
  });
});
