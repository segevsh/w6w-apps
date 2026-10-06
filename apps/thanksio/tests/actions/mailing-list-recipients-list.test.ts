import { assert, assertEquals, assertRejects } from "@std/assert";
import mailingListRecipientsList from "../../actions/mailing-list-recipients-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("mailing-list-recipients-list: calls GET /api/v2/mailing-lists-utils/recipients/7 and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "data": [{ "id": 1 }], "current_page": 1, "next_page_url": null, "total": 1 },
  }]);
  const out = await mailingListRecipientsList.execute(
    { "mailingListId": "7", "limit": 50, "updatedSince": "2026-01-01 00:00:00" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/mailing-lists-utils/recipients/7");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), { "limit": "50", "updated_since": "2026-01-01 00:00:00" });
  assertEquals(calls[0].body, null);
  assert(
    (out.recipients as unknown[]).length === 1 && out.nextPageUrl === null && out.total === 1,
    JSON.stringify(out),
  );
});

Deno.test("mailing-list-recipients-list: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { "message": "Not Found" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        mailingListRecipientsList.execute(
          { "mailingListId": "7", "limit": 50, "updatedSince": "2026-01-01 00:00:00" } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("HTTP 404") && err.message.includes("Not Found"), err.message);
});
