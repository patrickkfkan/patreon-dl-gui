export function getErrorString(error: unknown): string {
  if (error instanceof Error) {
    if (error.cause) {
      return `${error.message}: ${getErrorString(error.cause)}`;
    }
    return error.message;
  }
  else if (typeof error === 'object') {
    return JSON.stringify(error);
  }
  return String(error);
}