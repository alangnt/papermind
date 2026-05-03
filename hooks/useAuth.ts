import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";

export function useAuth() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateSignInForm = (email: string, password: string) => {
    if (!email.trim()) return "Username is required";
    if (!password.trim()) return "Password is required";
    return null;
  };

  const validateSignUpForm = (username: string, email: string, password: string, confirmPassword: string) => {
    if (!username.trim()) return 'Username is required';
    if (!email.trim()) return 'Email is required';
    if (!password.trim()) return 'Password is required';
    if (!confirmPassword.trim() || password !== confirmPassword) return 'Both passwords must match';
    return null;
  }

  const handleSignIn = async (data: FormData) => {
    const email = data.get("email") as string;
    const password = data.get("password") as string;

    const validationError = validateSignInForm(email, password);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      await signIn.email({
        email,
        password,
        callbackURL: "/"
      }, {
        onRequest: () => {
          setErrorMessage(null);
          setIsLoading(true);
        },
        onSuccess: () => {
          setIsLoading(false);
        },
        onError: () => {
          setErrorMessage("Invalid email or password");
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error("Error signing in: ", error);
      setErrorMessage("An error has occured, please try again later");
      setIsLoading(false);
    }
  }

  const handleSignUp = async (data: FormData) => {
    const username = data.get("username") as string;
    const email = data.get("email") as string;
    const password = data.get("password") as string;
    const confirmPassword = data.get("confirmPassword") as string;

    console.log(username, email, password, confirmPassword);

    const validationError = validateSignUpForm(username, email, password, confirmPassword);
    if (validationError) { 
      setErrorMessage(validationError); 
      return; 
    }

    try {
      await signUp.email({
        name: username,
        email,
        password
      }, {
        onRequest: () => {
          setErrorMessage(null);
          setIsLoading(true);
        },
        onSuccess: () => {
          setIsLoading(false);
          handleSignIn(data);
        },
        onError: () => {
          setErrorMessage("Invalid email or password");
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error("Error creating account: ", error);
      setErrorMessage("An error has occured, please try again later");
      setIsLoading(false);
    }
  }

  return { handleSignIn, handleSignUp, errorMessage, isLoading };
}