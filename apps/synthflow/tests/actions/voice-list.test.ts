import { assertEquals } from "@std/assert";
import voiceList from "../../actions/voice-list.ts";
import { mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { total_records: 1, limit: 20, offset: 0 };

Deno.test("voice-list: GET /voices with workspace, search and provider", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ pagination: PAGE, voices: [{ id: "v1" }] }) }]);
  const out = await voiceList.execute(
    { workspace: "w1", search: "ana", provider: "elevenlabs" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v2/voices");
  assertEquals(queryOf(calls[0].url), { workspace: "w1", search: "ana", provider: "elevenlabs" });
  assertEquals(out, { items: [{ id: "v1" }], pagination: PAGE });
});
