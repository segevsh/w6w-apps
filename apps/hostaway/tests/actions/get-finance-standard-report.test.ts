import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-finance-standard-report.ts";

Deno.test("get-finance-standard-report: POSTs form data, not JSON, and returns the CSV verbatim", async () => {
  const csv = '"Reservation ID"\tChannel\tStatus\n724558\tdirect\tnew\n';
  const { ctx, calls } = mockCtx([{ body: csv, headers: { "content-type": "text/csv" } }]);
  const result = await action.execute(
    {
      listingMapIds: [123],
      channelIds: [2007],
      statuses: ["new"],
      fromDate: "2019-01-30",
      toDate: "2019-02-25",
      dateType: "arrivalDate",
      sortBy: "arrivalDate",
      sortOrder: "asc",
      delimiter: "tab",
    },
    ctx,
  ) as { csv: string };

  assertEquals(calls[0].url, "https://api.hostaway.com/v1/finance/report/standard");
  assertEquals(calls[0].method, "POST");
  // multipart/form-data — the docs' curl example uses `--form`, not urlencoded, so the
  // runtime must generate the boundary itself; no content-type header is set by hand.
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(
    calls[0].body,
    "listingMapIds[0]=123&channelIds[0]=2007&statuses[0]=new&fromDate=2019-01-30" +
      "&toDate=2019-02-25&dateType=arrivalDate&format=csv&sortBy=arrivalDate&sortOrder=asc" +
      "&delimiter=tab",
  );
  assertEquals(result.csv, csv);
});

Deno.test("get-finance-standard-report: always asks for csv, the only documented format", async () => {
  const { ctx, calls } = mockCtx([{ body: "id\n" }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].body, "format=csv");
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("get-finance-standard-report: surfaces the account-feature failure from the body", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "fail", result: "financial reporting is not enabled for your account" },
  }]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("financial reporting is not enabled"), message);
});

Deno.test("get-finance-standard-report: the account-feature requirement is documented on the action", async () => {
  // The docs' Financial Reporting section: "Before using those endpoints please make
  // sure financial reporting feature is enabled for your account" — recorded as a
  // doc-comment, never as a runtime check.
  const src = await Deno.readTextFile(
    new URL("../../actions/get-finance-standard-report.ts", import.meta.url),
  );
  assert(
    /financial reporting[\s*]+feature is enabled for your account/i.test(src),
    "the requirement must be documented on the action",
  );
});
