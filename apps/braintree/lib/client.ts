import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Braintree GraphQL API — verified 2026-10-06 against the SDL at
 * `github.com/braintree/graphql-api` (`schema.graphql`) and the guides at
 * `developer.paypal.com/braintree/graphql/guides`.
 *
 * One endpoint per environment, POST only:
 *   production  https://payments.braintree-api.com/graphql
 *   sandbox     https://payments.sandbox.braintree-api.com/graphql
 *
 * Every request carries `Authorization: Basic base64(publicKey:privateKey)` and a
 * `Braintree-Version: YYYY-MM-DD` header; both are stamped by the Auth `sign` hook, never here.
 *
 * **Errors are HTTP 200.** The API answers 200 for everything, including a rejected credential;
 * the verdict is `errors[].extensions.errorClass` (AUTHENTICATION, AUTHORIZATION, VALIDATION,
 * NOT_FOUND, RESOURCE_LIMIT, INTERNAL, SERVICE_AVAILABILITY, ...). A mutation can also return a
 * partial `data` alongside `errors`, so this client treats ANY `errors` entry as a failure.
 */

export const ENVIRONMENTS = {
  production: { host: "payments.braintree-api.com", label: "Production" },
  sandbox: { host: "payments.sandbox.braintree-api.com", label: "Sandbox" },
} as const;

export type Environment = keyof typeof ENVIRONMENTS;

export const DEFAULT_ENVIRONMENT: Environment = "production";

/** `Braintree-Version` is a date; the docs recommend the day you start integrating. */
export const DEFAULT_API_VERSION = "2024-08-01";

export interface BraintreeCredential {
  publicKey: string;
  privateKey: string;
  environment?: string;
  apiVersion?: string;
}

/** Public (redacted-safe) connection metadata this app publishes. */
export interface BraintreeDisplay {
  environment?: Environment;
}

export function isEnvironment(v: unknown): v is Environment {
  return typeof v === "string" && Object.hasOwn(ENVIRONMENTS, v);
}

export function resolveEnvironment(connection: RedactedConnection | undefined): Environment {
  const display = (connection?.display ?? {}) as BraintreeDisplay;
  return isEnvironment(display.environment) ? display.environment : DEFAULT_ENVIRONMENT;
}

export function endpoint(env: Environment): string {
  return `https://${ENVIRONMENTS[env].host}/graphql`;
}

export interface GraphQLError {
  message?: string;
  path?: Array<string | number>;
  extensions?: {
    errorClass?: string;
    errorType?: string;
    legacyCode?: string;
    inputPath?: string[];
  };
}

export interface GraphQLResponse<T = Record<string, unknown>> {
  data?: T | null;
  errors?: GraphQLError[];
  extensions?: { requestId?: string };
}

/** One readable line per error: `[CLASS legacyCode] message (input.path)`. */
export function describeErrors(errors: GraphQLError[]): string {
  return errors.map((e) => {
    const x = e.extensions ?? {};
    const tag = [x.errorClass, x.legacyCode].filter(Boolean).join(" ");
    const where = x.inputPath?.length ? ` (${x.inputPath.join(".")})` : "";
    return `${tag ? `[${tag}] ` : ""}${e.message ?? "unknown error"}${where}`;
  }).join("; ");
}

/** True when the response carries an AUTHENTICATION-class error. */
export function isAuthError(body: GraphQLResponse | null): boolean {
  return (body?.errors ?? []).some((e) => e.extensions?.errorClass === "AUTHENTICATION");
}

/** Drop `undefined` and empty-string values so an unset form field is never sent. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  ) as Partial<T>;
}

/** Accept JSON as a parsed value or as the text a form field produces. */
export function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const t = value.trim();
  if (t === "") return undefined;
  try {
    return JSON.parse(t);
  } catch {
    return value;
  }
}

/** Accept a list as an array or as comma-separated text. */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const out = items.map((s) => s.trim()).filter((s) => s !== "");
  return out.length > 0 ? out : undefined;
}

/**
 * Custom fields go over the wire as `[{ name, value }]`. Accept that, or a plain
 * `{ name: value }` object, as parsed JSON or JSON text.
 */
export function customFields(value: unknown): Array<{ name: string; value: string }> | undefined {
  const v = jsonValue(value);
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return v as Array<{ name: string; value: string }>;
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>).map(([name, val]) => ({
      name,
      value: String(val),
    }));
  }
  throw new Error("customFields must be a JSON object or an array of {name, value}");
}

/**
 * Thin client over the GraphQL endpoint. Credentials are never handled here: the runtime routes
 * every `ctx.fetch` through the Auth `sign` hook.
 */
export class BraintreeClient {
  constructor(private readonly ctx: HookContext) {}

  get environment(): Environment {
    return resolveEnvironment(this.ctx.connection);
  }

  /** Default idempotency key: the invocation id, when the host supplies one. */
  get invocationKey(): string | undefined {
    return this.ctx.invocation?.invocationId;
  }

  /** Run one document; returns `data`. Throws on a non-JSON body or on any `errors` entry. */
  async execute<T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const res = await this.ctx.fetch(endpoint(this.environment), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(variables ? { query, variables } : { query }),
    });
    const text = await res.text();
    let body: GraphQLResponse<T> | null = null;
    try {
      body = text ? JSON.parse(text) as GraphQLResponse<T> : null;
    } catch { /* reported below */ }
    if (!body || typeof body !== "object") {
      throw new Error(`Braintree returned HTTP ${res.status} with a non-JSON body`);
    }
    if (body.errors?.length) {
      const id = body.extensions?.requestId;
      throw new Error(`Braintree: ${describeErrors(body.errors)}${id ? ` [requestId ${id}]` : ""}`);
    }
    if (!res.ok) throw new Error(`Braintree returned HTTP ${res.status}`);
    return (body.data ?? {}) as T;
  }

  /** Run a mutation/query and return the value of one root field, which must be non-null. */
  async field<T = Record<string, unknown>>(
    rootField: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const data = await this.execute<Record<string, T | null>>(query, variables);
    const value = data[rootField];
    if (value === undefined || value === null) {
      throw new Error(`Braintree returned no data for ${rootField}`);
    }
    return value;
  }
}

/** Wire an `apiRequestKey`: explicit input wins, else the invocation id. */
export function requestKey(client: BraintreeClient, explicit?: string): string | undefined {
  const k = explicit?.trim();
  return k ? k : client.invocationKey;
}
