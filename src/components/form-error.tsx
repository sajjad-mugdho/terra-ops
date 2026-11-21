export function FormError({ message }: { message?: string }) {
  return (
    <p role="alert" aria-live="polite" className="text-sm text-destructive empty:hidden">
      {message}
    </p>
  );
}

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {messages[0]}
    </p>
  );
}
