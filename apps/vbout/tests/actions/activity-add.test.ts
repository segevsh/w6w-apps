import { assert, assertEquals, assertRejects } from "@std/assert";
import activityAdd from "../../actions/activity-add.ts";
import { bodyOf, errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("activity-add: POSTs emailmarketing/addactivity.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  const out = await activityAdd.execute(
    { "id": "3", "description": "description-value", "datetime": "2026-10-06 14:30" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/addactivity.json");
  assertEquals(bodyOf(calls[0]), {
    "id": "3",
    "description": "description-value",
    "datetime": "2026-10-06 14:30",
  });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "ok": true, "data": [] });
});

Deno.test("activity-add: sends a form-encoded body, not a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  await activityAdd.execute(
    { "id": "3", "description": "description-value", "datetime": "2026-10-06 14:30" } as never,
    ctx,
  );
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("activity-add: is declared non-idempotent", () => {
  assertEquals(activityAdd.idempotent, false);
});

Deno.test("activity-add: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await activityAdd.execute(
        { "id": "3", "description": "description-value", "datetime": "2026-10-06 14:30" } as never,
        ctx,
      )
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
