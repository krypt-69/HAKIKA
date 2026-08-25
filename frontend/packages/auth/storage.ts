export function getTokenKey(namespace: string): string {
  return `${namespace}_token`;
}

export function getRefreshTokenKey(namespace: string): string {
  return `${namespace}_refresh_token`;
}
