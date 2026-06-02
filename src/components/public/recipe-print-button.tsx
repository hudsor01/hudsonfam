"use client";

import { Button } from "@/components/ui/button";

export function RecipePrintButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="no-print min-h-11 print:hidden"
      onClick={() => window.print()}
    >
      Print recipe
    </Button>
  );
}
