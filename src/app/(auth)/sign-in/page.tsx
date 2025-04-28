"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/app/contexts/LanguageContext";

const SignIn = () => {
  const supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  useEffect(() => {
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event, "Session:", session);
        setSession(session);
        setIsLoading(false);
        if (session?.user) {
          router.replace("/dashboard");
        }
      },
    );

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      if (session?.user) {
        router.replace("/dashboard");
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabaseClient, router]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative">
      {/* Simple, elegant background matching homepage */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#CBD1FF]/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#5169FE]/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md">
        {/* Login title with translation */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#171717]">
            {t("auth.signin.title")}
          </h1>
        </div>

        {/* Auth container - matching homepage card styling */}
        <div className="bg-[#F8F8FC] border border-gray-200 rounded-xl overflow-hidden shadow-md">
          <div className="p-8">
            <Auth
              supabaseClient={supabaseClient}
              providers={[]}
              magicLink={true}
              view="sign_in"
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "#5169FE",
                      brandAccent: "#4055E5",
                      inputBackground: "#FFFFFF",
                      inputBorder: "#E5E7EB",
                      inputBorderHover: "#5169FE",
                      inputBorderFocus: "#5169FE",
                      inputText: "#171717",
                      inputPlaceholder: "#9CA3AF",
                    },
                    radii: {
                      borderRadiusButton: "0.5rem",
                      buttonBorderRadius: "0.5rem",
                      inputBorderRadius: "0.5rem",
                    },
                    space: {
                      inputPadding: "14px",
                      buttonPadding: "14px",
                    },
                    fonts: {
                      bodyFontFamily:
                        "var(--font-plus-jakarta-sans), sans-serif",
                      buttonFontFamily:
                        "var(--font-plus-jakarta-sans), sans-serif",
                      inputFontFamily:
                        "var(--font-plus-jakarta-sans), sans-serif",
                      labelFontFamily:
                        "var(--font-plus-jakarta-sans), sans-serif",
                    },
                  },
                },
                className: {
                  button:
                    "bg-[#5169FE] hover:bg-[#4055E5] text-white font-medium hover:shadow-md transition-all",
                  input:
                    "focus:ring-1 focus:ring-[#5169FE] border border-gray-200",
                  label: "text-[#171717] font-medium",
                  anchor: "text-[#5169FE] hover:text-[#4055E5]",
                  message: "text-red-500",
                },
              }}
              theme="default"
              localization={{
                variables: {
                  sign_in: {
                    email_label: t("auth.signin.email"),
                    password_label: t("auth.signin.password"),
                    button_label: t("auth.signin.button"),
                    loading_button_label: t("auth.signin.loading"),
                    email_input_placeholder: t("auth.signin.emailPlaceholder"),
                    password_input_placeholder: t(
                      "auth.signin.passwordPlaceholder",
                    ),
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Custom links section for translations that couldn't be handled by the Auth component */}
        <div className="mt-3 mb-2 text-center">
          <Link
            href="/auth/reset-password"
            className="text-[#5169FE] hover:text-[#4055E5] text-sm transition-colors"
          >
            {t("auth.signin.forgotPassword")}
          </Link>
        </div>

        {/* Don't have an account? Sign up link - with translation */}
        <div className="mt-4 text-center">
          <p className="text-gray-600">
            {t("auth.signin.noAccount")}{" "}
            <Link
              href="/sign-up"
              className="text-[#5169FE] font-medium hover:text-[#4055E5] transition-colors"
            >
              {t("auth.signin.signup")}
            </Link>
          </p>
        </div>

        {/* Back to home link - with translation */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-gray-500 hover:text-[#5169FE] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>{t("auth.signin.backToHome")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
