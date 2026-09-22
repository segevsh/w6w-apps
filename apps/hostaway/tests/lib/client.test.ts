import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  asFlag,
  asNumber,
  asText,
  compact,
  formArray,
  HostawayClient,
  unwrapResult,
} from "../../lib/client.ts";

Deno.test("client: builds the URL against api.hostaway.com/v1 and never sets Authorization", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", result: { id: 40160 } } }]);
  await new HostawayClient(ctx).request("/listings/40160");
  assertEquals(calls[0].url, "https://api.hostaway.com/v1/listings/40160");
  assertEquals(calls[0].method, "GET");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: drops undefined/null/empty query values and keeps 0 and false", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", result: [] } }]);
  await new HostawayClient(ctx).request("/listings", {
    query: { limit: 0, offset: undefined, city: null, country: "", match: "beach" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "0");
  assertEquals(url.searchParams.get("match"), "beach");
  assertEquals(url.searchParams.has("offset"), false);
  assertEquals(url.searchParams.has("city"), false);
  assertEquals(url.searchParams.has("country"), false);
});

Deno.test("client: serializes array query params as repeated key[] (the docs' own convention)", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", result: [] } }]);
  await new HostawayClient(ctx).request("/reviews", {
    query: { listingMapIds: [1, 2], statuses: ["awaiting", "published"], limit: 10 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("listingMapIds[]"), ["1", "2"]);
  assertEquals(url.searchParams.getAll("statuses[]"), ["awaiting", "published"]);
  assertEquals(url.searchParams.get("limit"), "10");
});

Deno.test("client: unwraps the documented envelope's result", async () => {
  const { ctx } = mockCtx([{
    body: { status: "success", result: { id: 13, guestName: "Andrew" }, count: 1, page: 1 },
  }]);
  assertEquals(
    await new HostawayClient(ctx).request("/reservations/13"),
    { id: 13, guestName: "Andrew" },
  );
});

Deno.test("client: passes a bare body straight through when there is no envelope", async () => {
  const { ctx } = mockCtx([{ body: { id: 1, name: "Cable TV" } }]);
  assertEquals(await new HostawayClient(ctx).request("/amenities"), { id: 1, name: "Cable TV" });
});

Deno.test("client: requestPage keeps the envelope's paging metadata beside the array", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: "success",
      result: [{ id: 1 }],
      limit: 100,
      offset: 0,
      count: 250,
      page: 1,
      totalPages: 3,
    },
  }]);
  const page = await new HostawayClient(ctx).requestPage("/listings");
  assertEquals(page.items, [{ id: 1 }]);
  assertEquals(page.count, 250);
  assertEquals(page.page, 1);
  assertEquals(page.totalPages, 3);
  assertEquals(page.limit, 100);
  assertEquals(page.offset, 0);
});

Deno.test("client: requestPage tolerates an envelope with no result array", async () => {
  const { ctx } = mockCtx([{ body: { status: "success", result: null } }]);
  const page = await new HostawayClient(ctx).requestPage("/tasks");
  assertEquals(page.items, []);
});

Deno.test('client: classifies a 200 carrying status "fail" as a failure — the vendor\'s own discriminator', async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      status: "fail",
      message:
        "Listing error: cancellationPolicy: Value 'nonRefundable' for field 'Cancellation policy' is invalid",
    },
  }]);
  await assertRejects(
    () => new HostawayClient(ctx).request("/listings/40214", { method: "PUT", body: {} }),
    Error,
    "cancellationPolicy",
  );
});

Deno.test("client: reads the failure text from `result` (as the docs' Standard Response says)", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { status: "fail", result: 'The "images" parameter is required' },
  }]);
  await assertRejects(
    () => new HostawayClient(ctx).request("/listings/1/images"),
    Error,
    'The "images" parameter is required',
  );
});

Deno.test("client: reads the failure text from `message` too (what the live 403 envelope uses)", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: {
      status: "fail",
      message: "The resource owner or authorization server denied the request.",
    },
  }]);
  await assertRejects(
    () => new HostawayClient(ctx).request("/users"),
    Error,
    "The resource owner or authorization server denied the request.",
  );
});

Deno.test("client: a non-2xx without an envelope is still an error, with the HTTP status named", async () => {
  const { ctx } = mockCtx([{ status: 502, statusText: "Bad Gateway", body: "<html>nginx" }]);
  await assertRejects(
    () => new HostawayClient(ctx).request("/listings"),
    Error,
    "Hostaway 502 for GET /v1/listings",
  );
});

Deno.test("client: a fail envelope never masks the message behind the HTTP text", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: "fail", message: "Too many requests" },
  }]);
  await assertRejects(
    () => new HostawayClient(ctx).request("/reservations"),
    Error,
    "Too many requests",
  );
});

Deno.test("client: sends a JSON body with content-type application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", result: { id: 1 } } }]);
  await new HostawayClient(ctx).request("/tasks", { method: "POST", body: { title: "Clean" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"title":"Clean"}');
});

Deno.test("client: requestText returns the CSV verbatim and still classifies a JSON failure", async () => {
  const { ctx, calls } = mockCtx([{ body: "a,b\n1,2\n", headers: { "content-type": "text/csv" } }]);
  const csv = await new HostawayClient(ctx).requestText("/finance/report/standard", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "format=csv",
  });
  assertEquals(csv, "a,b\n1,2\n");
  assertEquals(calls[0].body, "format=csv");

  const failing = mockCtx([{
    status: 200,
    body: { status: "fail", message: "financial reporting is not enabled for your account" },
  }]);
  await assertRejects(
    () => new HostawayClient(failing.ctx).requestText("/finance/report/standard"),
    Error,
    "financial reporting is not enabled",
  );
});

Deno.test("client: requestForm sends multipart with no hand-set content-type", async () => {
  // The docs' curl example for this endpoint uses `--form` (multipart), and the PHP
  // example passes CURLOPT_POSTFIELDS as an array — php-curl only ever multipart-encodes
  // that shape. So this must NOT be application/x-www-form-urlencoded, and the boundary
  // has to come from the runtime, never a hand-written header.
  const { ctx, calls } = mockCtx([{
    body: "id,amount\n",
    headers: { "content-type": "text/csv" },
  }]);
  await new HostawayClient(ctx).requestForm("/finance/report/standard", {
    listingMapIds: formArray("listingMapIds", [123]),
    channelIds: formArray("channelIds", [2007, 2000]),
    statuses: formArray("statuses", ["new"]),
    fromDate: "2019-01-30",
    toDate: "2019-02-25",
    format: "csv",
    delimiter: "",
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(
    calls[0].body,
    "listingMapIds[0]=123&channelIds[0]=2007&channelIds[1]=2000&statuses[0]=new" +
      "&fromDate=2019-01-30&toDate=2019-02-25&format=csv",
  );
});

Deno.test("compact: drops unset values, keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: 0, c: false, d: undefined, e: null, f: "" }),
    { a: 1, b: 0, c: false },
  );
});

Deno.test("asNumber / asText / asFlag: Hostaway's documented 0/1 boolean posture", () => {
  assertEquals(asNumber("40160"), 40160);
  assertEquals(asNumber(0), 0);
  assertEquals(asNumber(""), undefined);
  assertEquals(asNumber("nope"), undefined);
  assertEquals(asText("  x "), "x");
  assertEquals(asText("   "), undefined);
  assertEquals(asFlag(true), 1);
  assertEquals(asFlag("false"), 0);
  assertEquals(asFlag("1"), 1);
  assertEquals(asFlag(undefined), undefined);
});

Deno.test("unwrapResult: strips only a real envelope", () => {
  assertEquals(unwrapResult({ status: "success", result: [1, 2] }), [1, 2]);
  assertEquals(unwrapResult({ status: "success" }), { status: "success" });
  assertEquals(unwrapResult("plain"), "plain");
  assert(unwrapResult(undefined) === undefined);
});
