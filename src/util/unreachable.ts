import { inspect } from './inspect';

export function unreachable(value: never): never {
  throw new Error(`should never get here (value=${inspect(value)})`);
}
