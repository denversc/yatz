import type {} from "bun";

export function inspect(value: unknown): string {
  return Bun.inspect(value);
}
