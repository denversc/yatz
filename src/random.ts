export function getRandomElement<T>(list: Readonly<T[]>): T {
  const length = list.length;
  if (length === 0) {
    throw new Error("getRandomElement() cannot be called with an empty array");
  }
  const randomIndex = Math.floor(Math.random() * length);
  return list[randomIndex]!;
}
