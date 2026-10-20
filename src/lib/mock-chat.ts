const OPENERS = [
  "I'm here. Say a little more about that.",
  "That landed. What part of it is heaviest right now?",
  "I have a feeling you already know the answer. Tell me anyway.",
  "Let's slow that down for a second.",
] as const;

const CLOSERS = [
  "What would make today one percent lighter?",
  "What are you leaving out when you tell the story that way?",
  "If you had to name the feeling in one word, what would it be?",
  "What do you want to happen next?",
] as const;

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

export function buildMockReply(input: { companionName: string; userText: string }): string {
  const seed = hash(`${input.companionName}:${input.userText}`);
  const opener = OPENERS[seed % OPENERS.length] ?? OPENERS[0];
  const closer = CLOSERS[(seed >> 3) % CLOSERS.length] ?? CLOSERS[0];
  const excerpt = input.userText.trim().replace(/\s+/g, " ").slice(0, 140);

  if (!excerpt) {
    return `${opener} ${closer}`;
  }

  return `You said: "${excerpt}". ${opener} ${closer}`;
}
