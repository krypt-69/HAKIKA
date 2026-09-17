export function getTokenKey(namespace: string): string {
  return `${namespace}_token`;
}

export function getRefreshTokenKey(namespace: string): string {
  return `${namespace}_refresh_token`;
}

export function getExpectedRoleKey(namespace: string): string {
  return `${namespace}_expected_role`;
}
