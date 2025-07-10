// https://stackoverflow.com/questions/69676439/create-constant-array-type-from-an-object-type/69676731#69676731
export type UnionToTuple<
  U extends string | number | symbol,
  R extends (string | number | symbol)[] = []
> =
  {
    [S in U]: Exclude<U, S> extends never ? [...R, S]
    : UnionToTuple<Exclude<U, S>, [...R, S]>;
  }[U] extends infer S extends string[] ?
    S
  : never;

/**
 * Converts a tuple of strings to a tuple of objects.
 * Each object in the tuple has type V & { VK: string; }
 * E.g.:
 * const objectTuple: TupleToObjectTuple<['a', 'b'], { label: string; }> =
 * [
 *   {value: 'a', label: 'some string' },
 *   {value: 'b', label: 'some other string' }
 * ]
 */
export type TupleToObjectTuple<
  T extends (string | number | symbol)[],
  V extends object = object,
  VK extends string = "value"
> = {
  [K in keyof T]: T[K] extends string | number | symbol ?
    V & { [key in VK]: T[K] }
  : never;
};

export type UnionToObjectTuple<
  U extends string | number | symbol,
  V extends object = object,
  VK extends string = "value"
> = TupleToObjectTuple<UnionToTuple<U>, V, VK>;

export type ObjectKeysByValueType<S extends object, T> = {
  [K in keyof S]: S[K] extends T ? K : never;
}[keyof S];

// https://stackoverflow.com/questions/42999983/typescript-removing-readonly-modifier
export type DeepWriteable<T> = {
  -readonly [P in keyof T]: DeepWriteable<T[P]>;
};
