import { assertEquals, assertThrows } from "@std/assert";
import listProfiles from "../../actions/list-profiles.ts";
import { API_ROOT, errorBody, mockCtx, pagination, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-profiles: GET /1.0/profiles — outside /commerce, on purpose", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      pagination: pagination(),
      profiles: [{
        id: "PR1",
        email: "foo@example.com",
        isCustomer: true,
        transactionsSummary: { orderCount: 2 },
      }],
    },
  }]);
  const out = await listProfiles.execute!({ filter: "isCustomer" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1.0/profiles");
  assertEquals(queryOf(calls[0].url), { filter: "isCustomer" });
  assertEquals(out.profiles?.[0].transactionsSummary, { orderCount: 2 });
});

Deno.test("list-profiles: sorting, filtering and paging query keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { pagination: pagination(), profiles: [] } }]);
  await listProfiles.execute!({
    sortField: "createdOn",
    sortDirection: "dsc",
    filter: "isCustomer;hasAccount",
  }, ctx);

  assertEquals(
    calls[0].url,
    `${API_ROOT}/1.0/profiles?filter=isCustomer%3BhasAccount` +
      "&sortField=createdOn&sortDirection=dsc",
  );
});

Deno.test("list-profiles: email with an isCustomer filter is refused before the call", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => listProfiles.execute!({ email: "foo@example.com", filter: "isCustomer" }, ctx),
    Error,
    "cannot be combined with the `isCustomer`/`hasAccount` filters",
  );
});

Deno.test("list-profiles: a cursor cannot ride along with a filter", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => listProfiles.execute!({ cursor: "CUR", filter: "hasAccount" }, ctx),
    Error,
    "cannot be combined with a filter",
  );
});

Deno.test("list-profiles: email alone is allowed", async () => {
  const { ctx, calls } = mockCtx([{ body: { pagination: pagination(), profiles: [] } }]);
  await listProfiles.execute!({ email: "foo@example.com" }, ctx);

  assertEquals(queryOf(calls[0].url), { email: "foo@example.com" });
});

Deno.test("list-profiles: a vendor 400 is surfaced verbatim", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "INVALID_ARGUMENT",
      message: "filter is invalid",
    }),
  }]);

  let message = "";
  try {
    await listProfiles.execute!({ filter: "bogus" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("400 INVALID_REQUEST_ERROR/INVALID_ARGUMENT"), true);
});
