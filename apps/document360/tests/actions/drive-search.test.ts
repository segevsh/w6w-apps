import { assertEquals } from "@std/assert";
import driveSearch from "../../actions/drive-search.ts";
import {
  listEnvelope,
  mockCtx,
  pathOf,
  PID,
  problem,
  PROBLEM_HEADERS,
  queryOf,
} from "../_helpers.ts";

Deno.test("drive-search: repeats array filters as repeated query keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "x1" }]) }]);
  const out = await driveSearch.execute({
    searchKeyword: "logo",
    allowImagesOnly: true,
    userIds: ["u1", "u2"],
    filterTags: "a, b",
  }, ctx) as { items: unknown[] };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/drive/search`);
  assertEquals(new URL(calls[0].url).searchParams.getAll("user_ids"), ["u1", "u2"]);
  assertEquals(new URL(calls[0].url).searchParams.getAll("filter_tags"), ["a", "b"]);
  assertEquals(queryOf(calls[0].url).search_keyword, "logo");
  assertEquals(queryOf(calls[0].url).allow_images_only, "true");
  assertEquals(calls[0].body, null);
  assertEquals(out.items.length, 1);
});

Deno.test("drive-search: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await driveSearch.execute({
      searchKeyword: "logo",
      allowImagesOnly: true,
      userIds: ["u1", "u2"],
      filterTags: "a, b",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
