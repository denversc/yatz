/**
 * A recursive version of TypeScript's built-in Readonly<T>.
 * Makes all properties of an object and its nested objects/arrays read-only.
 */
export type DeepReadonly<T> = T extends Function
  ? T
  : T extends Array<infer U>
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
