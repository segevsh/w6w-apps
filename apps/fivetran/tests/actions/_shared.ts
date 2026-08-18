/** Fivetran's `{code, message, data}` envelope. */
export const ok = (data: unknown) => ({ status: 200, body: { code: "Success", data } });

/** One page of a Fivetran list. */
export const page = (items: unknown[], next: string | null = null) =>
  ok({ items, next_cursor: next });
