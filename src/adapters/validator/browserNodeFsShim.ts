function unavailable(): never {
  throw new Error(
    'Browser validation and generation use in-memory workspaces; filesystem access is unavailable in Explorer.',
  );
}

export const stat = unavailable;
export const readdir = unavailable;
export const readFile = unavailable;

export const promises = {
  stat,
  readdir,
  readFile,
};
