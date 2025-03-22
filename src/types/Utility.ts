// https://stackoverflow.com/questions/69676439/create-constant-array-type-from-an-object-type/69676731#69676731
export type UnionToTuple<U extends string, R extends unknown[] = []> =
  {
    [S in U]: Exclude<U, S> extends never ? [...R, S]
    : UnionToTuple<Exclude<U, S>, [...R, S]>;
  }[U] extends infer S extends unknown[] ?
    S
  : never;

/**
 * Extended from UnionToTuple
 * U: union (e.g. 'all' | 'custom' | 'none')
 * V: object (e.g. { label: string; }, default: {})
 * VK: value key (default: 'value')
 * Returns: [V & { VK: U1 }, V & { VK: U2 }...] (e.g. [{value: 'all', label: string}, {value: 'custom', label: string}, {value: 'none', label: string}])
 *
 * Note: 'infer' is used to avoid 'Type instantiation is excessively deep' errors. See: https://github.com/microsoft/TypeScript/issues/54910
 */
export type UnionToObjectTuple<
  U extends string | number | symbol,
  V extends object = object,
  VK extends string = "value",
  R extends unknown[] = []
> =
  {
    [S in U]: Exclude<U, S> extends never ? [...R, V & { [key in VK]: S }]
    : UnionToObjectTuple<Exclude<U, S>, V, VK, [...R, V & { [key in VK]: S }]>;
  }[U] extends infer S extends (V & { [key in VK]: string })[] ?
    S
  : never;

export type ObjectKeysByValueType<S extends object, T> = {
  [K in keyof S]: S[K] extends T ? K : never;
}[keyof S];

// https://stackoverflow.com/questions/42999983/typescript-removing-readonly-modifier
export type DeepWriteable<T> = {
  -readonly [P in keyof T]: DeepWriteable<T[P]>;
};
