export function flattenMessages(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const flattened: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenMessages(value as Record<string, unknown>, newKey));
    } else {
      flattened[newKey] = String(value);
    }
  }
  return flattened;
}

export function getMessageByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/** Top-level ICU argument names: `{name}` or `{count, plural, ...}`. */
export function extractIcuArgs(message: string): string[] {
  const args = new Set<string>();
  const re = /\{([A-Za-z_][A-Za-z0-9_]*)(?:\s*,|\s*\})/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(message)) !== null) {
    args.add(match[1]);
  }
  return [...args].sort();
}
