'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import i18n, { forceReloadTranslations } from '@/app/i18n';
import type { Session } from '@supabase/supabase-js';
import { loadStripe } from '@stripe/stripe-js';

export const dynamic = 'force-dynamic';

// Credit package options with competitive pricing
const CREDIT_PACKAGES = [
  { id: 'basic', name: 'Basic', credits: 10, price: 9.99, popular: false },
  { id: 'standard', name: 'Standard', credits: 25, price: 19.99, popular: true, bestValue: false },
  { id: 'pro', name: 'Pro', credits: 50, price: 29.99, popular: false, bestValue: true },
  { id: 'enterprise', name: 'Enterprise', credits: 100, price: 49.99, popular: false }
];

// Initialize Stripe outside the component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function BillingPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [i18nInitialized, setI18nInitialized] = useState(false);
  const { t } = useTranslation();

  // Force reload translations when component mounts
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        if (i18n.language) {
          await forceReloadTranslations(i18n.language);
          setI18nInitialized(true);
        }
      } catch (error) {
        console.error("Error loading translations:", error);
        // Set initialized even on error to prevent infinite loading
        setI18nInitialized(true);
      }
    };
    
    loadTranslations();
  }, []);

  // Session handling and redirection
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setIsLoadingAuth(false);
    });

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log("Billing Page Initial Session: ", initialSession);
      if (!session) { // Set initial session only if not already set
        setSession(initialSession);
      }
      // Wait for listener to set loading false
      if (isLoadingAuth) {
          setIsLoadingAuth(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]); // Keep router dependency

  // Fetch user credits - depends on session
  useEffect(() => {
    // Moved redirection logic to session handling useEffect

    async function fetchUserData(currentSession: Session | null) { // Accept session as arg
      if (!currentSession?.user?.id) {
        setUserCredits(null); // Clear credits if no user
        return;
      }

      try {
        const { data, error } = await supabase // Use state client
          .from('profiles')
          .select('credits')
          .eq('id', currentSession.user.id) // Use arg session
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            await supabase // Use state client
              .from('profiles')
              .insert({ id: currentSession.user.id, credits: 0 }); // Use arg session
            setUserCredits(0);
          } else {
            console.error("Error fetching user credits:", error);
            setUserCredits(0); // Default to 0 on other errors
          }
        } else {
          setUserCredits(data?.credits ?? 0); // Use nullish coalescing
        }
      } catch (error) {
        console.error("Error fetching user credits:", error);
        setUserCredits(0); // Default to 0 on catch
      }
    }

    // Fetch only when session status is known (not undefined)
    if (session !== undefined) {
        fetchUserData(session);
    }
  }, [session, supabase]); // Depend on session and supabase

  const handlePurchaseCredits = async (packageId: string) => {
    if (!session?.user?.id) {
      toast.error(t("billing.mustBeLoggedIn"));
      return;
    }

    setIsProcessing(packageId);

    try {
      // Find the selected package - needed for UI feedback potentially
      const selectedPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
      if (!selectedPackage) {
        throw new Error(t("billing.invalidPackage"));
      }
      
      // 1. Call the backend to create a checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId: packageId, userId: session.user.id }),
      });

      const checkoutSession = await response.json();

      if (!response.ok) {
        throw new Error(checkoutSession.error || 'Failed to create checkout session');
      }

      // 2. Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe.js failed to load.');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: checkoutSession.sessionId,
      });

      if (error) {
        console.error("Stripe redirect error:", error);
        throw error; // Throw error to be caught below
      }

      // Note: DB update is now handled by the webhook
      // The user will be redirected away, so local state update isn't strictly needed here
      // unless you show a success message on the redirect back.

    } catch (error: any) {
      console.error("Error purchasing credits:", error);
      toast.error(error.message || t("billing.purchaseFailed"));
      setIsProcessing(null); // Reset button on error
    } 
    // No finally block needed as redirect happens on success
  };

  // Updated loading check
  if (isLoadingAuth || !i18nInitialized) { // Check auth loading and i18n
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-800">Loading...</p>
        </div>
      </div>
    );
  }

  // If loading is done but there's no session, render null (or redirect handled by useEffect)
  if (!session) return null;

  return (
    <div className="min-h-screen">
      {/* Background elements matching dashboard */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]"></div>
      </div>
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("billing.title")}</h1>
          <p className="text-gray-600 mt-2">{t("billing.subtitle")}</p>
        </div>

        {/* Credit Balance Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-xl p-6 mb-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <p className="text-blue-100 text-sm mb-1">{t("billing.currentBalance")}</p>
              <h2 className="text-4xl font-bold">{userCredits !== null ? userCredits : '...'} {t("billing.credits")}</h2>
              <p className="mt-2 text-blue-100">{t("billing.costPerBrochure")}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <button 
                onClick={() => document.getElementById('credit-packages')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-2.5 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                {t("billing.buyMoreCredits")}
              </button>
            </div>
          </div>
        </div>

        {/* Credit Packages */}
        <div id="credit-packages" className="bg-white border border-gray-200 rounded-xl shadow-md p-8 mb-12">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t("billing.creditPackages")}</h2>
            <p className="text-gray-600">{t("billing.choosePackage")}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <div 
                key={pkg.id}
                className={`relative p-6 rounded-xl border ${
                  pkg.popular ? 'border-blue-300 ring-2 ring-blue-500 ring-opacity-50' : 
                  pkg.bestValue ? 'border-green-300' : 'border-gray-200'
                } bg-white hover:shadow-md transition-shadow`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                    {t("billing.mostPopular")}
                  </div>
                )}
                {pkg.bestValue && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-green-600 text-white text-xs rounded-full">
                    {t("billing.bestValue")}
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{pkg.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">${pkg.price.toFixed(2)}</span>
                </div>
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">{t("billing.whatsIncluded")}:</p>
                  <div className="flex items-center text-gray-700 mb-2">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">{pkg.credits} {t("billing.credits")}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t("billing.justPerCredit", { price: (pkg.price / pkg.credits).toFixed(2) })}</span>
                  </div>
                </div>
                <button
                  onClick={() => handlePurchaseCredits(pkg.id)}
                  disabled={isProcessing === pkg.id}
                  className={`w-full py-2.5 px-4 border rounded-lg text-sm font-medium transition-colors ${
                    pkg.popular || pkg.bestValue 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 border-transparent' 
                      : 'bg-white text-gray-900 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {isProcessing === pkg.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t("billing.processing")}
                    </span>
                  ) : (
                    t("billing.purchaseNow")
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t("billing.howCreditsWork")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex space-x-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{t("billing.purchaseCredits")}</h3>
                <p className="mt-1 text-gray-600">{t("billing.purchaseCreditsDesc")}</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{t("billing.createBrochures")}</h3>
                <p className="mt-1 text-gray-600">{t("billing.createBrochuresDesc")}</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{t("billing.noExpiration")}</h3>
                <p className="mt-1 text-gray-600">{t("billing.noExpirationDesc")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 