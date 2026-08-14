// Minimal, dependency-free extraction for the constrained XML shapes our
// prompts require. Not a general XML parser — deliberately narrow.

export function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

export function extractList(xml: string, containerTag: string, itemTag: string): string[] {
  const container = extractTag(xml, containerTag);
  if (!container) return [];
  const matches = [...container.matchAll(new RegExp(`<${itemTag}>([\\s\\S]*?)<\\/${itemTag}>`, "gi"))];
  return matches.map((m) => m[1].trim()).filter(Boolean);
}
