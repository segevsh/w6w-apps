import type { ActionDefinition } from "@w6w/types";
import { compact, LobClient } from "../lib/client.ts";

interface Input {
  address?: string;
  recipient?: string;
  primaryLine?: string;
  secondaryLine?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  urbanization?: string;
  properCase?: boolean;
}

const usVerify: ActionDefinition<Input> = {
  key: "us-verify",
  type: "read",
  resource: "verification",
  title: "Verify US Address",
  description:
    "Verify and standardize a US address. Pass either the separate fields or one free-form address string. A test key returns a canned result rather than a real verification.",
  params: [
    {
      key: "address",
      label: "Free-form address",
      type: "string",
      hint:
        'A whole address on one line, e.g. "210 King St, San Francisco, CA 94107". Use this OR the fields below, not both.',
    },
    { key: "recipient", label: "Recipient", type: "string" },
    {
      key: "primaryLine",
      label: "Primary line",
      type: "string",
      hint: "Street line, e.g. 210 King St. Required unless Free-form address is used.",
    },
    { key: "secondaryLine", label: "Secondary line", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "zipCode", label: "ZIP code", type: "string" },
    {
      key: "urbanization",
      label: "Urbanization",
      type: "string",
      advanced: true,
      hint: "Puerto Rico only.",
    },
    {
      key: "properCase",
      label: "Proper-case the result",
      type: "boolean",
      advanced: true,
      hint: "Lob returns UPPER CASE by default.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Verification ID" },
    {
      key: "deliverability",
      type: "string",
      label:
        "deliverable | deliverable_unnecessary_unit | deliverable_incorrect_unit | deliverable_missing_unit | undeliverable",
    },
    { key: "primary_line", type: "string", label: "Standardized primary line" },
    { key: "secondary_line", type: "string", label: "Standardized secondary line" },
    { key: "last_line", type: "string", label: "City, state and ZIP+4" },
    { key: "components", type: "object", label: "Parsed address components" },
    {
      key: "deliverability_analysis",
      type: "object",
      label: "Why the address got this deliverability",
    },
  ],

  execute(input, ctx) {
    // Lob's body is one of two shapes: the single `address` string, or the split fields.
    // Sending both makes the request ambiguous, so say so before spending a call.
    const split = compact({
      recipient: input.recipient,
      primary_line: input.primaryLine,
      secondary_line: input.secondaryLine,
      urbanization: input.urbanization,
      city: input.city,
      state: input.state,
      zip_code: input.zipCode,
    });
    let body: Record<string, unknown>;
    if (input.address) {
      if (Object.keys(split).length > 0) {
        throw new Error("Use either the free-form address or the separate fields, not both");
      }
      body = { address: input.address };
    } else {
      if (!input.primaryLine) throw new Error("Primary line (or a free-form address) is required");
      body = split;
    }
    return new LobClient(ctx).json("/us_verifications", {
      method: "POST",
      query: { case: input.properCase ? "proper" : undefined },
      body,
    });
  },
};

export default usVerify;
