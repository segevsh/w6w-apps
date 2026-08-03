import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-channels.ts";

Deno.test("get-channels: hits /youtube/v3/channels with part and a comma-joined id list", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ part: ["snippet", "statistics"], id: ["UC1", "UC2"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/youtube/v3/channels");
  assertEquals(url.searchParams.get("part"), "snippet,statistics");
  assertEquals(url.searchParams.getAll("id"), ["UC1,UC2"]);
});

Deno.test("get-channels: supports mine, forHandle and forUsername as alternatives", async () => {
  for (
    const [input, key, value] of [
      [{ part: "id", mine: true }, "mine", "true"],
      [{ part: "id", forHandle: "@example" }, "forHandle", "@example"],
      [{ part: "id", forUsername: "legacy" }, "forUsername", "legacy"],
      [{ part: "id", managedByMe: true }, "managedByMe", "true"],
    ] as Array<[Record<string, unknown>, string, string]>
  ) {
    const { ctx, calls } = mockCtx([{ body: {} }]);
    // deno-lint-ignore no-explicit-any
    await action.execute!(input as any, ctx);
    assertEquals(new URL(calls[0].url).searchParams.get(key), value);
  }
});

Deno.test("get-channels: rejects zero filters and several filters alike", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet" }, ctx);
    },
    Error,
    "exactly one of",
  );
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet", id: "UC1", mine: true }, ctx);
    },
    Error,
    "exactly one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-channels: mine=false is not a filter", async () => {
  // A falsy `mine` must not be counted as a supplied filter, or a plain id
  // lookup with mine explicitly off would be rejected.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "id", id: "UC1", mine: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("id"), "UC1");
  assertEquals(calls.length, 1);
});

Deno.test("get-channels: forwards paging and localisation parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    part: "snippet",
    mine: true,
    maxResults: 50,
    pageToken: "tok",
    hl: "fr",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("maxResults"), "50");
  assertEquals(p.get("pageToken"), "tok");
  assertEquals(p.get("hl"), "fr");
});

Deno.test("get-channels: offers contentDetails, which carries the uploads playlist ID", () => {
  const part = action.params!.find((p) => p.key === "part");
  const values = (part!.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values.includes("contentDetails"), true);
  assertEquals(part?.default, "snippet,statistics");
});
