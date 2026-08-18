/** The connection every action test runs against. */
export const display = { region: "US", accountId: 12345, userName: "Ada" };

/** A GraphQL success. */
export const ok = (data: unknown) => ({ status: 200, body: { data } });

/** GraphQL errors, which arrive inside a 200. */
export const gqlError = (message: string, path?: string[]) => ({
  status: 200,
  body: { errors: [{ message, path }] },
});
