import { MEMBER_STATUS_NAMES, ORG_TYPE_NAMES, POLICY_TYPE_NAMES } from "./client.ts";

type Obj = Record<string, unknown>;

/** Add the human names for the integer enums Bitwarden returns bare. */
export function shapeMember(m: unknown): Obj {
  const o = (m ?? {}) as Obj;
  return {
    member: o,
    id: o.id,
    userId: o.userId,
    email: o.email,
    name: o.name ?? null,
    type: o.type,
    typeName: ORG_TYPE_NAMES[Number(o.type)],
    status: o.status,
    statusName: MEMBER_STATUS_NAMES[Number(o.status)],
    twoFactorEnabled: o.twoFactorEnabled,
    externalId: o.externalId ?? null,
    collections: o.collections ?? [],
  };
}

export function shapePolicy(p: unknown): Obj {
  const o = (p ?? {}) as Obj;
  return {
    policy: o,
    id: o.id,
    type: o.type,
    typeName: POLICY_TYPE_NAMES[Number(o.type)],
    enabled: o.enabled,
    data: o.data ?? null,
  };
}

export function shapeGroup(g: unknown): Obj {
  const o = (g ?? {}) as Obj;
  return {
    group: o,
    id: o.id,
    name: o.name,
    externalId: o.externalId ?? null,
    collections: o.collections ?? [],
  };
}

export function shapeCollection(c: unknown): Obj {
  const o = (c ?? {}) as Obj;
  return {
    collection: o,
    id: o.id,
    externalId: o.externalId ?? null,
    groups: o.groups ?? [],
  };
}

/** `{ object: "list", data: [...] }` → the array, whatever else is on the envelope. */
export function items(page: unknown): unknown[] {
  const data = (page as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? data : [];
}
