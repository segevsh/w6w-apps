import { assertEquals, assertRejects } from "@std/assert";
import stickyNoteUpdate from "../../actions/sticky-note-update.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "muralId": "ws12345.1600",
  "widgetId": "w-1",
  "text": "edited",
  "x": 10,
  "y": 20,
  "style": '{"backgroundColor": "#FFE08AFF"}',
};

Deno.test("sticky-note-update: PATCH /murals/{muralId}/widgets/sticky-note/{widgetId}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "value": { "id": "x1", "title": "T" } },
  }]);
  const out = await stickyNoteUpdate.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/murals/ws12345.1600/widgets/sticky-note/w-1");
  assertEquals(calls[0].url.startsWith("https://app.mural.co/api/public/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "text": "edited",
    "x": 10,
    "y": 20,
    "style": { "backgroundColor": "#FFE08AFF" },
  });
  assertEquals(out.id, "x1");
});

Deno.test("sticky-note-update: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "value": { "id": "x1", "title": "T" } },
  }]);
  await stickyNoteUpdate.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("sticky-note-update: a vendor error surfaces its own code and message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "TOKEN_EXPIRED", message: "Your token has expired." },
  }]);
  const err = await assertRejects(async () => await stickyNoteUpdate.execute(INPUT, ctx)) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("TOKEN_EXPIRED"), true);
  assertEquals(err.message.includes("Your token has expired."), true);
});

Deno.test("sticky-note-update: an empty muralId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await stickyNoteUpdate.execute({ ...INPUT, muralId: "  " as never }, ctx)
  );
  assertEquals(calls.length, 0);
});
