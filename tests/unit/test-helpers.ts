import { expect } from "vitest";

export function expectRoute<T>(result: T | null): T {
  expect(result).not.toBeNull();
  return result as T;
}
