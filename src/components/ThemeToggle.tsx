import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      onClick={toggle}
      title={isDark ? "Switch to light" : "Switch to dark"}
      className={compact ? "h-8 w-8" : "gap-2 justify-start w-full text-sidebar-foreground/70"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && (isDark ? "Light mode" : "Dark mode")}
    </Button>
  );
}
