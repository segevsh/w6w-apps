import type { Param } from "@w6w/types";

type Opts = { required?: boolean; hint?: string };

export const str = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "string", ...o }) as Param;
export const text = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "text", ...o }) as Param;
export const int = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "number", validation: { integer: true }, ...o }) as Param;
export const num = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "number", ...o }) as Param;
export const bool = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "boolean", ...o }) as Param;
export const json = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "json", ...o }) as Param;
const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));
export const select = (key: string, label: string, values: string[], o: Opts = {}): Param =>
  ({ key, label, type: "select", options: opts(values), ...o }) as Param;
export const multi = (key: string, label: string, values: string[], o: Opts = {}): Param =>
  ({ key, label, type: "multiselect", options: opts(values), ...o }) as Param;
