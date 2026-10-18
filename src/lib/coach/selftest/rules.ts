// Simple rule checks for grading coach replies.

export interface Rule {
  name: string;
  test: (reply: string) => boolean;
}

/** Word count of a reply. */
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Passes when the reply matches `re`. */
export const has = (name: string, re: RegExp): Rule => ({ name, test: (r) => re.test(r) });

/** Passes when the reply does not match `re`. */
export const lacks = (name: string, re: RegExp): Rule => ({ name, test: (r) => !re.test(r) });

/** Passes when the reply is at most `n` words. */
export const maxWords = (n: number): Rule => ({ name: `At most ${n} words`, test: (r) => words(r) <= n });

/** Passes when the reply is at least `n` words. */
export const minWords = (n: number): Rule => ({ name: `At least ${n} words of coaching`, test: (r) => words(r) >= n });

/** Counts regex matches in a reply. */
const count = (r: string, re: RegExp) => (r.match(re) ?? []).length;

/** Applied to every answer: the tone rules from the system prompt (warm is fine, hype and slang are not). */
export const TONE: Rule[] = [
  lacks("No slang", /\b(bro|bruh|dude|lol|gonna|wanna|beast mode|crush(ing)? it|let'?s go+)\b/i),
  { name: "At most two emojis", test: (r) => count(r, /\p{Extended_Pictographic}/gu) <= 2 },
  { name: "At most three exclamation marks", test: (r) => count(r, /!/g) <= 3 },
  lacks("No empty 'None' sections", /\*\*[^*\n]+\*\*\s*[–:-]?\s*None\b/i),
];

/** Passes when the reply doesn't brush the question off as outside the coach's role. */
export const answersInScope: Rule = lacks(
  "Doesn't call it outside its role",
  /outside (the )?(scope|of (my|what i))|not (something|within) (i|my)|beyond (my|the) (scope|role)|can'?t help with that/i,
);
