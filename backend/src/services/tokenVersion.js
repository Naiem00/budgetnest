// Old login tokens (without a version) remain valid until a password update.
export function tokenVersionMatches(tokenVersion, storedVersion) {
  return Number.isSafeInteger(storedVersion) && storedVersion >= 0 &&
    (tokenVersion == null ? 0 : tokenVersion) === storedVersion
}
