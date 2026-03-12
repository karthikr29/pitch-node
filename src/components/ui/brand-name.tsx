import { cn } from "@/lib/utils";

interface BrandNameProps {
  italic?: boolean;
  className?: string;
}

export function BrandName({ italic, className }: BrandNameProps) {
  return (
    <span className={cn("text-primary", italic && "italic", className)}>
      ConvoSparr
    </span>
  );
}
