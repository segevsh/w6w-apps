import type { ActionDefinition, Param } from "@w6w/types";
import { type ApiVersion, licenseOutput, PayhipClient } from "./client.ts";

export interface LicenseInput {
  licenseKey: string;
  apiVersion?: ApiVersion;
  productLink?: string;
}

export const LICENSE_PARAMS: Param[] = [
  {
    key: "licenseKey",
    label: "License Key",
    type: "string",
    required: true,
    placeholder: "WTKP4-66NL5-HMKQW-GFSCZ",
  },
  {
    key: "apiVersion",
    label: "API Version",
    type: "select",
    default: "v2",
    options: [
      { value: "v2", label: "v2 (current) — product secret key" },
      { value: "v1", label: "v1 (legacy) — account API key" },
    ],
    hint: "Must match the connection's auth method: v2 pairs with a Product Secret Key " +
      "connection, v1 (legacy) with an Account API Key connection.",
  },
  {
    key: "productLink",
    label: "Product Link",
    type: "string",
    placeholder: "mVT0",
    hint: "Legacy v1 only: the product's link code (the last part of its Payhip URL). " +
      "Ignored on v2, where the product secret key identifies the product.",
  },
];

export const LICENSE_OUTPUT = [
  { key: "found", type: "boolean", label: "Payhip returned a license record" },
  { key: "enabled", type: "boolean", label: "Enabled" },
  { key: "productLink", type: "string", label: "Product link" },
  { key: "licenseKey", type: "string", label: "License key" },
  { key: "buyerEmail", type: "string", label: "Buyer email" },
  { key: "uses", type: "number", label: "Uses" },
  { key: "date", type: "string", label: "Issued at" },
] as const;

interface Spec {
  key: string;
  type: "read" | "perform";
  title: string;
  description: string;
  op: string;
  method: "GET" | "PUT";
  /** perform only. */
  idempotent?: boolean;
  /** When true an empty response is an answer ("not valid"), otherwise a failure. */
  emptyIsResult?: boolean;
}

/** One license action; the five differ only in path, verb and how an empty reply reads. */
export function licenseAction(spec: Spec): ActionDefinition<LicenseInput> {
  return {
    key: spec.key,
    type: spec.type,
    resource: "license",
    title: spec.title,
    description: spec.description,
    ...(spec.type === "perform" ? { idempotent: spec.idempotent ?? false } : {}),
    params: LICENSE_PARAMS,
    output: [...LICENSE_OUTPUT],

    async execute(input, ctx) {
      const license = await new PayhipClient(ctx).call(spec.op, spec.method, {
        version: input.apiVersion,
        licenseKey: input.licenseKey,
        productLink: input.productLink,
      });
      if (license === null && !spec.emptyIsResult) {
        throw new Error(
          `Payhip returned an empty response for license/${spec.op}: the key is unknown, ` +
            "the credential does not match this product, or the update was refused.",
        );
      }
      return licenseOutput(license);
    },
  };
}
