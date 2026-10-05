import { assertEquals } from "@std/assert";
import participantsList from "../../actions/participants-list.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("participants-list: GET /report/{date_id}/participants, status filter, unwraps", async () => {
  const { ctx, calls } = mockCtx([
    { body: { participants: [{ email: "a@b.c", attended: true }] } },
    { body: {} },
  ]);
  const out = await participantsList.execute({ dateId: 7, status: "did not attend" }, ctx) as {
    participants: unknown[];
  };
  assertEquals(out.participants.length, 1);
  assertEquals(calls[0].url, `${API_ROOT}/report/7/participants?status=did+not+attend`);
  assertEquals(
    ((await participantsList.execute({ dateId: 7 }, ctx)) as { participants: unknown[] })
      .participants,
    [],
  );
  assertEquals(calls[1].url, `${API_ROOT}/report/7/participants`);
});
