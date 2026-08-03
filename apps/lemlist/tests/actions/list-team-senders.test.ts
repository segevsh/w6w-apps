import { assertEquals } from "@std/assert";
import listTeamSenders from "../../actions/list-team-senders.ts";
import { mockCtx, optionValues, param } from "../_helpers.ts";

Deno.test("list-team-senders: GETs /team/senders with no filter by default", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listTeamSenders.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.lemlist.com/api/team/senders");
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-team-senders: forwards the campaign state filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listTeamSenders.execute!({ state: "running" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("state"), "running");
});

Deno.test("list-team-senders: labels the filter as the CAMPAIGN's state, not the sender's", () => {
  assertEquals(param(listTeamSenders, "state").label, "Campaign state");
  assertEquals(
    [...optionValues(listTeamSenders, "state")].sort(),
    ["archived", "draft", "ended", "errors", "paused", "running"],
  );
});
