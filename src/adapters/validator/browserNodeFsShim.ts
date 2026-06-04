function unavailable(): never {
  throw new Error(
    'Browser validation uses in-memory workspaces; filesystem access is unavailable in Explorer.',
  );
}

export const promises = {
  stat: unavailable,
  readdir: unavailable,
  readFile: unavailable,
};
