export type ContentPath = (string | number)[];
export function atPath(object: any, path: any) {
  return path.reduce((value: any, key: any) => value?.[key], object);
}
export function setPath(object: any, path: any, value: any) {
  if (!path.length) return value;
  const [key, ...rest] = path;
  const result = Array.isArray(object)
    ? [...object]
    : object == null && typeof key === 'number'
      ? []
      : { ...object };
  result[key] = setPath(object?.[key], rest, value);
  return result;
}
