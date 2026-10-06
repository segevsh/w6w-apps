import type { Param } from "@w6w/types";

type Opts = { required?: boolean; hint?: string; default?: string | number | boolean };

export const str = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "string", ...o }) as Param;
export const text = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "text", ...o }) as Param;
export const int = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "number", validation: { integer: true }, ...o }) as Param;
export const bool = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "boolean", ...o }) as Param;
export const json = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "json", ...o }) as Param;
export const select = (
  key: string,
  label: string,
  values: string[],
  o: Opts = {},
): Param =>
  ({
    key,
    label,
    type: "select",
    options: values.map((v) => ({ value: v, label: v })),
    ...o,
  }) as Param;
