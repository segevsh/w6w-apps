import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  buildXml,
  CreditRepairCloudClient,
  CreditRepairCloudError,
  decodeXmlEntities,
  describeVendorError,
  directChildFields,
  escapeXml,
  formBody,
  parseXmlResponse,
  signUrl,
} from "../../lib/client.ts";
import { errorResponse, formFieldOf, mockCtx, okResponse, xmlDataOf } from "../_helpers.ts";

Deno.test("escapeXml: escapes every XML metacharacter", () => {
  assertEquals(
    escapeXml(`Beaton & Sons <"quoted"> 'text'`),
    "Beaton &amp; Sons &lt;&quot;quoted&quot;&gt; &apos;text&apos;",
  );
  assertEquals(escapeXml("plain"), "plain");
  // A single pass: an escaped ampersand is not re-escaped.
  assertEquals(escapeXml("&amp;"), "&amp;amp;");
});

Deno.test("decodeXmlEntities: named and numeric references", () => {
  assertEquals(
    decodeXmlEntities("a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos;"),
    `a & b <c> "d" 'e'`,
  );
  assertEquals(decodeXmlEntities("&#65;&#x42;"), "AB");
  assertEquals(decodeXmlEntities("unknown &nope; stays"), "unknown &nope; stays");
  assertEquals(decodeXmlEntities("out of range &#x110000; stays"), "out of range &#x110000; stays");
});

Deno.test("buildXml: wraps fields in the documented document", () => {
  assertEquals(
    buildXml("lead", { firstname: "Ada", type: "Client" }),
    "<crcloud><lead><firstname>Ada</firstname><type>Client</type></lead></crcloud>",
  );
  assertEquals(
    buildXml("client", { id: "MQ==" }),
    "<crcloud><client><id>MQ==</id></client></crcloud>",
  );
});

Deno.test("buildXml: omits empty values and escapes the ones it sends", () => {
  assertEquals(
    buildXml("affiliate", { firstname: "A & B", lastname: "", email: undefined, city: null }),
    "<crcloud><affiliate><firstname>A &amp; B</firstname></affiliate></crcloud>",
  );
  assertEquals(buildXml("lead", { memo: "   " }).includes("memo"), false);
});

Deno.test("buildXml: refuses a key that is not a valid element name", () => {
  assertThrows(() => buildXml("lead", { "bad key": "x" }), Error, "not a valid XML element name");
});

Deno.test("signUrl: appends both credentials to the query string, nothing else", () => {
  const signed = new URL(
    signUrl("https://app.creditrepaircloud.com/api/lead/viewRecord?extra=1", {
      apiauthkey: "key-1",
      secretkey: "secret-1",
    }),
  );
  assertEquals(signed.pathname, "/api/lead/viewRecord");
  assertEquals(signed.searchParams.get("apiauthkey"), "key-1");
  assertEquals(signed.searchParams.get("secretkey"), "secret-1");
  assertEquals(signed.searchParams.get("extra"), "1");
});

Deno.test("formBody: percent-encodes the document under `xmlData`", () => {
  const body = formBody("<crcloud><lead><firstname>A & B</firstname></lead></crcloud>");
  assertEquals(
    formFieldOf(body, "xmlData"),
    "<crcloud><lead><firstname>A & B</firstname></lead></crcloud>",
  );
  assert(body.startsWith("xmlData="), body);
});

Deno.test("parseXmlResponse: the live error envelope, verbatim", () => {
  const raw = errorResponse(4406, "Wrong API Key or Secret key");
  const parsed = parseXmlResponse(raw);
  assertEquals(parsed?.success, false);
  assertEquals(parsed?.errorCode, 4406);
  assertEquals(parsed?.errorMessage, "Wrong API Key or Secret key");
  // `<result>`'s only direct child is `<errors>`, whose own markup is flattened.
  assertEquals(parsed?.result, { errors: "4406 Wrong API Key or Secret key" });
  assertEquals(parsed?.raw, raw);
});

Deno.test("parseXmlResponse: a success envelope, with result children as a flat map", () => {
  const parsed = parseXmlResponse(
    okResponse("<id>MQ==</id><firstname>Ada</firstname><status>Client</status>"),
  );
  assertEquals(parsed?.success, true);
  assertEquals(parsed?.errorCode, null);
  assertEquals(parsed?.errorMessage, null);
  assertEquals(parsed?.result, { id: "MQ==", firstname: "Ada", status: "Client" });
});

Deno.test("parseXmlResponse: a success envelope with no <result> yields null", () => {
  const parsed = parseXmlResponse(okResponse());
  assertEquals(parsed?.success, true);
  assertEquals(parsed?.result, null);
});

Deno.test("parseXmlResponse: result values are entity-decoded and trimmed", () => {
  const parsed = parseXmlResponse(okResponse("<memo>  A &amp; B  </memo>"));
  assertEquals(parsed?.result, { memo: "A & B" });
});

Deno.test("parseXmlResponse: an unrecognised body is null, never a guess", () => {
  assertEquals(parseXmlResponse(""), null);
  assertEquals(parseXmlResponse("<html><body>502 Bad Gateway</body></html>"), null);
  assertEquals(parseXmlResponse("<response><success>maybe</success></response>"), null);
});

Deno.test("directChildFields: tracks depth, so nested text is not a sibling", () => {
  assertEquals(
    directChildFields("<a><b>inner</b>tail</a><c/>"),
    { a: "inner tail", c: "" },
  );
  assertEquals(directChildFields("<a>one</a><a>two</a>"), { a: "one" });
});

Deno.test("describeVendorError: quotes the code, its meaning and the vendor's message", () => {
  const parsed = parseXmlResponse(errorResponse(4413, "Incorrect Client ID"))!;
  const message = describeVendorError(parsed);
  assert(message.includes("error 4413"), message);
  assert(message.includes("Incorrect Client ID"), message);
});

Deno.test("describeVendorError: credential codes tell the caller to reconnect", () => {
  const parsed = parseXmlResponse(errorResponse(4406, "Wrong API Key or Secret key"))!;
  const message = describeVendorError(parsed);
  assert(message.includes("reconnect the Connection"), message);
  // The vendor's own prose carries no credential material, and neither does this.
  assert(!message.includes("apiauthkey"), message);
});

Deno.test("describeVendorError: an unmapped code still produces a message", () => {
  const parsed = parseXmlResponse(errorResponse(4499, "Something new"))!;
  assert(describeVendorError(parsed).includes("error 4499"));
  const bare = parseXmlResponse("<response><success>False</success><result/></response>")!;
  assert(describeVendorError(bare).includes("with no error code"), describeVendorError(bare));
});

Deno.test("client: POSTs the form body and returns the parsed success envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: okResponse("<id>MQ==</id>") }]);
  const out = await new CreditRepairCloudClient(ctx, {
    path: "/api/lead/viewRecord",
    root: "client",
  }).send({ id: "MQ==" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.creditrepaircloud.com/api/lead/viewRecord");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(xmlDataOf(calls[0].body), "<crcloud><client><id>MQ==</id></client></crcloud>");
  assertEquals(out.success, true);
  assertEquals(out.result, { id: "MQ==" });
});

Deno.test("client: a vendor error throws with the vendor's own code and message", async () => {
  const { ctx } = mockCtx([{ body: errorResponse(4410, "Wrong ID in update") }]);
  const err = await assertThrowsAsync(() =>
    new CreditRepairCloudClient(ctx, { path: "/api/lead/updateRecord", root: "lead" }).send({
      id: "1",
    })
  ) as CreditRepairCloudError;
  assert(err instanceof CreditRepairCloudError);
  assert(err.message.includes("4410"), err.message);
  assert(err.message.includes("Wrong ID in update"), err.message);
  assertEquals(err.parsed?.errorCode, 4410);
});

Deno.test("client: an unreadable body throws rather than reporting success", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>not this API</html>" }]);
  const err = await assertThrowsAsync(() =>
    new CreditRepairCloudClient(ctx, { path: "/api/lead/viewRecord", root: "client" }).send({
      id: "MQ==",
    })
  ) as CreditRepairCloudError;
  assert(err instanceof CreditRepairCloudError);
  assert(err.message.includes("unreadable response"), err.message);
  assertEquals(err.parsed, null);
});

Deno.test("client: the verdict comes from the body, not the HTTP status", async () => {
  // A 500 with a good envelope is still a success as far as the vendor's own
  // contract goes; a 200 with success False is still a failure. Both directions.
  const okOn500 = mockCtx([{ status: 500, body: okResponse("<id>MQ==</id>") }]);
  const out = await new CreditRepairCloudClient(okOn500.ctx, {
    path: "/api/lead/viewRecord",
    root: "client",
  }).send({ id: "MQ==" });
  assertEquals(out.success, true);

  const failOn200 = mockCtx([{ status: 200, body: errorResponse(4407, "API Key is inactive") }]);
  await assertThrowsAsync(() =>
    new CreditRepairCloudClient(failOn200.ctx, {
      path: "/api/lead/viewRecord",
      root: "client",
    }).send({ id: "MQ==" })
  );
});

/** `assertRejects` with a captured error, for inspecting the instance and fields. */
async function assertThrowsAsync(fn: () => Promise<unknown>): Promise<Error> {
  try {
    await fn();
  } catch (err) {
    return err as Error;
  }
  throw new Error("expected the call to throw");
}
