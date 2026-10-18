import { renderIcon } from "@/lib/icon";

// iOS Home Screen icon (iOS ignores manifest icons and uses apple-touch-icon).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderIcon(180);
}
