import { ReactNode } from "react";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthStatusCardProps = {
  title: string;
  description: string;
  tone?: "default" | "destructive";
  actions?: ReactNode;
  footer?: ReactNode;
};

export function AuthStatusCard({
  title,
  description,
  tone = "default",
  actions,
  footer,
}: AuthStatusCardProps) {
  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display">{title}</CardTitle>
        <CardDescription
          className={cn(
            "mx-auto max-w-md text-base leading-relaxed",
            tone === "destructive" && "text-destructive/90"
          )}
        >
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions}
        {footer}
      </CardContent>
    </>
  );
}
