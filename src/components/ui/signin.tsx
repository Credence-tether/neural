import { useState, useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { cn } from "@/lib/utils.ts";

export function SignInButton({ className }: { className?: string }) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);
      try {
        await signIn("password", { email, password, flow: step });
      } catch (err) {
        setError(
          step === "signIn"
            ? "Invalid email or password."
            : "Could not create account. Try a different email or a longer password.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [signIn, email, password, step],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-4 w-full max-w-sm", className)}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isLoading}>
        {isLoading
          ? "Please wait..."
          : step === "signIn"
            ? "Sign In"
            : "Sign Up"}
      </Button>
      <button
        type="button"
        className="text-sm text-muted-foreground hover:underline"
        onClick={() => {
          setStep(step === "signIn" ? "signUp" : "signIn");
          setError(null);
        }}
      >
        {step === "signIn"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}