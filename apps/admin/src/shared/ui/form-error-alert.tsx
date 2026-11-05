import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@avocado/ui/components/alert";

export function FormErrorAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
