import { assert, assertEquals } from "@std/assert";
import listTimeOffRequests from "../../actions/list-time-off-requests.ts";
import { mockCtx, optionValues, param } from "../_helpers.ts";

const WINDOW = { start: "2026-09-01", end: "2026-09-30" };

Deno.test("list-time-off-requests: searches /time_off/requests over a window", async () => {
  assertEquals(listTimeOffRequests.type, "search");
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listTimeOffRequests.execute({ ...WINDOW }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/time_off/requests");
  assertEquals(url.searchParams.get("start"), "2026-09-01");
  assertEquals(url.searchParams.get("end"), "2026-09-30");
});

Deno.test("list-time-off-requests: start and end are the only required params", () => {
  // The only list endpoint in this app with a mandatory window — the filter is
  // an overlap test and has no meaning without both sides.
  const required = (listTimeOffRequests.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required.sort(), ["end", "start"]);
});

Deno.test("list-time-off-requests: the window hints explain the OVERLAP semantics", () => {
  // `start` matches on the request's END date and vice versa. Getting this
  // backwards silently returns the wrong set.
  assert(/end date/i.test(param(listTimeOffRequests, "start").hint ?? ""));
  assert(/start date/i.test(param(listTimeOffRequests, "end").hint ?? ""));
});

Deno.test("list-time-off-requests: the perspective options are the documented three", () => {
  assertEquals(optionValues(listTimeOffRequests, "action"), ["view", "approve", "myRequests"]);
  assertEquals(param(listTimeOffRequests, "action").default, "view");
});

Deno.test("list-time-off-requests: optional filters pass through when set", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listTimeOffRequests.execute({
    ...WINDOW,
    action: "approve",
    employeeId: "42",
    id: "7",
    type: "1,2",
    status: "requested",
  }, ctx);

  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("action"), "approve");
  assertEquals(q.get("employeeId"), "42");
  assertEquals(q.get("id"), "7");
  assertEquals(q.get("type"), "1,2");
  assertEquals(q.get("status"), "requested");
});

Deno.test("list-time-off-requests: excludeNote is sent only when true", async () => {
  // Documented as "when set to ANY truthy value" — so a literal `false` would
  // also read as truthy and must never be sent.
  const { ctx, calls } = mockCtx([{ body: [] }, { body: [] }]);
  await listTimeOffRequests.execute({ ...WINDOW, excludeNote: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("excludeNote"), "1");

  await listTimeOffRequests.execute({ ...WINDOW, excludeNote: false }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("excludeNote"), false);
});
