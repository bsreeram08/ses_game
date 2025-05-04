"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  EmailAuthProvider,
  linkWithCredential,
  updateProfile,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

const conversionSchema = z.object({
  email: z.string().email({ message: "Valid email is required" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  displayName: z
    .string()
    .min(2, { message: "Display name must be at least 2 characters" }),
});

type ConversionFormInputs = z.infer<typeof conversionSchema>;

export function AnonymousConversion() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConversionFormInputs>({
    resolver: zodResolver(conversionSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      email: "",
      password: "",
    },
  });

  // Only show for anonymous users
  if (!user?.isAnonymous) {
    return null;
  }

  const onSubmit = async (data: ConversionFormInputs) => {
    if (!user) return;

    setConversionLoading(true);
    setError(null);

    try {
      // Create credential
      const credential = EmailAuthProvider.credential(
        data.email,
        data.password
      );

      // Link anonymous account with credential
      const result = await linkWithCredential(user, credential);

      // Update profile with display name
      await updateProfile(result.user, { displayName: data.displayName });

      // Update Firestore document
      await updateDoc(doc(db, "users", user.uid), {
        displayName: data.displayName,
        email: data.email,
        isAnonymous: false,
        updatedAt: new Date(),
      });

      // Show success message and close dialog after delay
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        // Reload the page to reflect changes
        window.location.reload();
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to convert account. Please try again.";
      setError(errorMessage);
    } finally {
      setConversionLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-2"
          aria-label="Save Account"
        >
          Save Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Permanent Account</DialogTitle>
          <DialogDescription>
            Convert your guest account to a permanent account to save your
            progress and settings.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="p-4 bg-green-50 text-green-700 rounded-md">
            Account successfully converted! You can now sign in with your email
            and password.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                {...register("displayName")}
                className={errors.displayName ? "border-red-500" : ""}
              />
              {errors.displayName && (
                <p className="text-red-500 text-sm">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-red-500 text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={conversionLoading}>
                {conversionLoading ? "Converting..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
