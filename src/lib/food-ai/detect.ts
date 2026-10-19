// Does a chat message describe food, so the coach chat can offer "Log as food"? Pure.

// Past tense or a named meal ("I had…", "lunch was…"), not "what should I eat?".
const EATING = /\b(ate|eaten|had|drank|breakfast|lunch|dinner|snack)\b/i;
const AMOUNT = /\b\d+(?:[.,]\d+)?\s?(?:g|grams?|ml|kcal|cal|calories|oz|slices?|eggs?|cups?|tbsp|tsp|pieces?|scoops?)\b/i;
const MEAL_NUMBERS = /\b\d+\s?(?:kcal|calories)\b|\b\d+\s?g (?:of )?(?:protein|carbs|fat)\b/i;

/** Your own message reads like something you ate ("I had 2 eggs and toast", "200 g chicken for lunch"). */
/** Questions only count when they include an amount ("I had 200 g of rice, was that too much?"). */
export const describesEating = (text: string) =>
  text.length <= 1000 && (AMOUNT.test(text) || (EATING.test(text) && !text.includes("?")));

/** A coach reply that suggests a meal with numbers (worth offering to log). */
export const suggestsMeal = (text: string) => MEAL_NUMBERS.test(text) && /\b(breakfast|lunch|dinner|snack|meal|eat|try)\b/i.test(text);

/** Link to Add food with the AI card filled in (the user still checks before anything is saved). */
export const logFoodHref = (text: string) => `/nutrition/add?ai=${encodeURIComponent(text.slice(0, 1000))}`;
