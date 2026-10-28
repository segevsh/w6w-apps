import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-team-members.ts";

Deno.test("list-team-members: GETs /teams/{id}/members with the OData params", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ userId: "u1" }] } }]);
  const out = await action.execute({
    teamId: "t1",
    filter: "microsoft.graph.aadUserConversationMember/userId eq 'u1'",
    select: ["id", "roles"],
    top: 100,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/teams/t1/members");
  assertEquals(
    url.searchParams.get("$filter"),
    "microsoft.graph.aadUserConversationMember/userId eq 'u1'",
  );
  assertEquals(url.searchParams.get("$select"), "id,roles");
  assertEquals(url.searchParams.get("$top"), "100");
  assertEquals(out.value.length, 1);
});

Deno.test("list-team-members: allows the documented 999 page size, not 50", () => {
  const top = action.params!.find((p) => p.key === "top")!;
  assertEquals(top.default, 100);
  assertEquals(top.validation?.max, 999);
});

Deno.test("list-team-members: replays a nextLink verbatim, ignoring other params", async () => {
  const link = "https://graph.microsoft.com/v1.0/teams/t1/members?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ teamId: "t1", nextLink: link, top: 999, filter: "ignored" }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("list-team-members: follows every page when `all` is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/teams/t1/members?p=2";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ teamId: "t1", all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
});
