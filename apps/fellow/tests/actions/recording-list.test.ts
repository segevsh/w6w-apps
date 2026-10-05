import { assertEquals, assertRejects } from "@std/assert";
import recordingList from "../../actions/recording-list.ts";
import { bodyOf, mockCtx, page, pathOf } from "../_helpers.ts";

Deno.test("recording-list: POST /api/v1/recordings on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { recordings: page([{ id: "r1" }], "cur2", 10) },
  }]);
  const out = await recordingList.execute({
    pageSize: 10,
    includeTranscript: true,
    title: "Sync",
    createdAtStart: "2026-01-01",
    mediaUrlExpiresIn: 7200,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/recordings");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(bodyOf(calls[0]), {
    pagination: { page_size: 10 },
    include: { transcript: true },
    filters: { title: "Sync", created_at_start: "2026-01-01" },
    media_url: { expire_in: 7200 },
  });
  assertEquals((out as { cursor: string; hasMore: boolean; items: unknown[] }).cursor, "cur2");
});

Deno.test("recording-list: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        recordingList.execute({
          pageSize: 10,
          includeTranscript: true,
          title: "Sync",
          createdAtStart: "2026-01-01",
          mediaUrlExpiresIn: 7200,
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
