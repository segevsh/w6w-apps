/** Shared validation for the Salesforce poll triggers that build a SOQL string from user params. */
const identifier = /^[A-Za-z0-9_]+$/;

/**
 * The `SELECT` field list: the caller's fields (default `Id,Name,CreatedDate`) with `Id` and every
 * name in `required` added. Object and field names are API names, so letters, digits and `_` only —
 * nothing else may reach the SOQL text.
 */
export function selectFields(
  input: { object: string; fields?: string },
  required: string[],
): string {
  const fields = (input.fields ?? "Id,Name,CreatedDate").split(",").map((field) => field.trim());
  if (
    !identifier.test(input.object) || fields.length === 0 ||
    fields.some((field) => !identifier.test(field))
  ) {
    throw new Error(
      "Salesforce object and field API names may contain only letters, numbers, and underscores",
    );
  }
  for (const name of ["Id", ...required]) {
    if (!fields.includes(name)) fields.push(name);
  }
  // Id first, as in the new-record trigger.
  return ["Id", ...fields.filter((f) => f !== "Id")].join(", ");
}
