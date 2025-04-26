"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import Link from "next/link";
import {
  BasicInfoStep,
  AmenitiesStep,
  ContactInfoStep,
  ImagesStep,
  TemplateStep,
  PagesSelectionStep,
  CommissionStep,
  DescriptionsStep
} from '@/components/dashboard/form-steps';
import { availablePages, PageOption } from '@/components/dashboard/form-steps/PagesSelectionStep';
import { processPropertyDescription } from '@/utils/ai-helpers';
import mammoth from 'mammoth';
import { toast } from 'react-hot-toast';
import { verifyApiConnection } from '@/utils/test-api';
import ImageUploader from '@/components/ImageUploader';
import { useTranslation } from 'react-i18next';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { PropertyPlaceholders, defaultPlaceholders, ImagePlaceholders } from '@/types/placeholders';
import i18n from '@/app/i18n'; // Import i18n instance
import { cities } from '@/data/cityData'; // Import city data

// Define the steps for the form
const getFormSteps = (t: any) => [
  { title: t('formSteps.template.title'), description: t('formSteps.template.description') },
  { title: t('formSteps.pages.title'), description: t('formSteps.pages.description') },
  { title: t('formSteps.basicInfo.title'), description: t('formSteps.basicInfo.description') },
  { title: t('formSteps.descriptions.title'), description: t('formSteps.descriptions.description') },
  { title: t('formSteps.images.title'), description: t('formSteps.images.description') },
  { title: t('formSteps.amenities.title'), description: t('formSteps.amenities.description') },
  { title: t('formSteps.commission.title'), description: t('formSteps.commission.description') },
  { title: t('formSteps.contactInfo.title'), description: t('formSteps.contactInfo.description') },
];

interface Project {
  id: string;
  title: string;
  address: string;
  created_at: string;
  status: string;
  template_id: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  preview_image_url: string;
}

type UploadStage = 'idle' | 'uploading' | 'complete' | 'error';

const Dashboard = () => {
  const { t } = useTranslation();
  const FORM_STEPS = getFormSteps(t);
  
  // Initialize session state
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<ImagePlaceholders>({
    '{{logo}}': '',
    '{{agent}}': '',
    '{{image1}}': '',
    '{{image2}}': '',
    '{{image3}}': '',
    '{{image4}}': '',
    '{{image5}}': '',
    '{{image6}}': '',
    '{{image7}}': '',
    '{{image8}}': '',
  });
  const [logoUrl, setLogoUrl] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Use the imported defaultPlaceholders for complete initial state:
  const [placeholders, setPlaceholders] = useState<PropertyPlaceholders>(defaultPlaceholders);

  // Add new state for tracking auto-filled fields and raw property data
  const [autoFilledFields, setAutoFilledFields] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [rawPropertyData, setRawPropertyData] = useState<string>('');
  // Add state for storing document text that persists across steps
  const [documentText, setDocumentText] = useState<string>('');

  // Add selectedPages state
  const [selectedPages, setSelectedPages] = useState<Record<string, boolean>>(() => {
    // Initialize all pages as selected by default
    const initialPages: Record<string, boolean> = {};
    availablePages.forEach((page: PageOption) => {
      initialPages[page.id] = true;
    });
    return initialPages;
  });

  // Add this new state for onboarding
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [onboardingData, setOnboardingData] = useState({
    logo: '',
    brokerPhoto: '',
    phoneNumber: '',
    emailAddress: '',
    websiteName: ''
  });
  const [onboardingErrors, setOnboardingErrors] = useState({
    logo: false,
    brokerPhoto: false,
    phoneNumber: false,
    emailAddress: false,
    websiteName: false
  });

  // Update session handling and redirection
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log("Auth State Change: ", event, currentSession);
      setSession(currentSession);
      setIsLoading(false); // Set loading to false once session status is known
    });

    // Initial check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log("Initial Session Check: ", initialSession);
      if (!session) { // Only set if session state is currently null
        setSession(initialSession);
      }
      // Ensure loading is false eventually if initial check runs
       if (isLoading) {
         setIsLoading(false);
       }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]); // Keep router dependency for potential future use, but not for redirect

  // Check API connectivity on initial load
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const result = await verifyApiConnection();
        
        if (!result.success) {
          // Show specific error messages based on the error type
          let errorMessage = t('api.connectionFailed');
          
          switch (result.error) {
            case "API_KEY_MISSING":
              errorMessage = t('api.keyMissing');
              break;
            case "API_KEY_INVALID_FORMAT":
              errorMessage = t('api.keyInvalidFormat');
              break;
            case "API_KEY_INVALID":
              errorMessage = t('api.keyInvalid');
              break;
            case "API_RATE_LIMIT":
              errorMessage = t('api.rateLimit');
              break;
            case "NETWORK_ERROR":
              errorMessage = t('api.networkError');
              break;
            default:
              errorMessage = result.message || t('api.connectionFailed');
          }
          
          toast.error(errorMessage, { 
            id: "api-connection",
            duration: 10000
          });
          
          console.error("API connection error:", result.error, result.message);
        }
      } catch (error) {
        console.error("Error checking API connection:", error);
        toast.error(t('api.verifyFailed'), { 
          id: "api-connection",
          duration: 10000
        });
      }
    };
    
    checkApiConnection();
  }, [t]);

  // Fetch projects - depends on session
  const fetchProjects = async (currentSession: Session | null) => {
    if (!currentSession?.user?.id) return;
    
    const { data, error } = await supabase
      .from('real_estate_projects')
      .select('*')
      .eq('user_id', currentSession.user.id)  // Filter by current user's ID
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    if (data) {
      setProjects(data);
    }
  };

  // Fetch templates - does not depend on session
  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*');

    if (data) {
      setTemplates(data);
    }
  };

  // Fetch credits - depends on session
  const fetchCredits = async (currentSession: Session | null) => {
    if (currentSession?.user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', currentSession.user.id)
        .single();
      
      if (data) {
        setCredits(data.credits);
      } else if (error) {
        console.error('Error fetching credits:', error);
      }
    }
  };

  // Supabase channel listener - depends on session.id
  useEffect(() => {
    if (!supabase || !session?.user?.id) return;

    const channel = supabase
      .channel('credits')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        (payload: any) => {
          setCredits(payload.new.credits);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, supabase]);

  // Handle successful payment - depends on session
  useEffect(() => {
    if (sessionId && session) { // Check if session exists
      try {
        window.history.replaceState({}, '', '/dashboard');
        fetchProjects(session);
        fetchTemplates();
        fetchCredits(session);
      } catch (error) {
        console.error('Error handling successful payment:', error);
      }
    }
  }, [sessionId, session, supabase]); // Add session and supabase dependencies

  // Initial data fetching when session is confirmed
  useEffect(() => {
    if (session?.user?.id) {
        console.log("Session confirmed, fetching initial data...");
        fetchProjects(session);
        fetchTemplates();
        fetchCredits(session);
        ensureProfileExists(session);
    }
  }, [session, supabase]); // Depend on session

  // Fetch user profile - depends on session
  useEffect(() => {
    const fetchUserProfile = async (currentSession: Session | null) => {
      if (currentSession?.user?.id) {
        console.log("Fetching user profile for dashboard");
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .single();
        
        if (data && data.is_onboarded) {
          console.log("Found user profile data:", data);
          
          // Pre-populate contact information from user profile
          setPlaceholders(prev => ({
            ...prev,
            phone_number: data.phone_number || '',
            email_address: data.email_address || '',
            website_name: data.website_name || '',
            name_brokerfirm: data.company_name || '',
            address_brokerfirm: data.address || '',
            broker_name: data.broker_name || ''
          }));
          
          // Pre-populate logo and broker photo
          if (data.logo_url) {
            setLogoUrl(data.logo_url);
          }
          
          if (data.broker_photo_url) {
            const newImages = { ...uploadedImages };
            newImages['{{agent}}'] = data.broker_photo_url;
            setUploadedImages(newImages);
          }
        } else {
          console.log("No user profile found or not onboarded");
        }
      }
    };

    if (session) {
        fetchUserProfile(session);
    }
  }, [session, supabase]);

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    dataToUpdate?: Partial<PropertyPlaceholders> // Optional data for city change
  ) => {
    const { name, value } = e.target;

    setPlaceholders(prev => {
      let newState: PropertyPlaceholders = { ...prev };

      // If extra data is provided (from city change), merge it first
      if (dataToUpdate) {
        newState = { ...newState, ...dataToUpdate };
        // Don't automatically overwrite cityname if it was set by dataToUpdate
        // The name might be 'cityname' from the select event, but dataToUpdate has precedence
        if (name !== 'cityname') {
           newState = { ...newState, [name]: value };
        }
        } else {
        // Standard input change
        newState = { ...newState, [name]: value };
      }


      // Update priceplaceholder based on offer_type
      if (name === 'offer_type' || (dataToUpdate && dataToUpdate.offer_type)) {
          const currentOfferType = dataToUpdate?.offer_type || value;
          if (currentOfferType === 'for_sale') {
            newState.priceplaceholder = "Kaufpreis"; // Use German term
          } else if (currentOfferType === 'for_rent') {
            newState.priceplaceholder = "Monatliche Miete"; // Use German term
          } else {
            newState.priceplaceholder = "";
          }
          console.log(`offer_type changed to ${currentOfferType}, setting priceplaceholder to: ${newState.priceplaceholder}`);
      }


      // If AI regeneration data is passed
      if (name === 'ai_regeneration' && dataToUpdate) {
          console.log("Applying AI regenerated fields:", dataToUpdate);
          newState = { ...newState, ...dataToUpdate }; // Merge all regenerated fields
      }

      return newState;
    });
  };

  // Handle form navigation
  const goToNextStep = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`[goToNextStep] Current Step BEFORE validation/advance: ${currentStep}`);
    // Validate current step before proceeding
    if (currentStep === 0 && !selectedTemplate) {
      setError(t('error.selectTemplate'));
      return;
    }
    
    if (currentStep === 1 && !selectedPages) {
      setError(t('error.selectPages'));
      return;
    }
    
    if (currentStep === 2 && !placeholders.title) {
      setError(t('error.titleRequired'));
      return;
    }
    
    // --- BEGIN: Add validation for Object Type and Offer Type --- 
    if (currentStep === 2) { // When leaving the Basic Info step
      if (!placeholders.object_type) {
        setError(t('error.objectTypeRequired'));
        return;
      }
      if (!placeholders.offer_type) {
        setError(t('error.offerTypeRequired'));
        return;
      }
    }
    // --- END: Add validation ---
    
    // Add validation for the Descriptions step
    if (currentStep === 3 && !placeholders.shortdescription) {
      setError(t('error.shortDescriptionRequired'));
      return;
    }
    
    // Clear any previous errors
    setError(null);
    
    // Move to the next step
    if (currentStep < FORM_STEPS.length - 1) {
      console.log(`[goToNextStep] Advancing from step ${currentStep} to ${currentStep + 1}`);
      setCurrentStep(currentStep + 1);
    } else {
      console.log(`[goToNextStep] Already on last step (${currentStep}).`);
    }
  };

  const goToPreviousStep = () => {
    console.log(`[goToPreviousStep] Current Step BEFORE moving back: ${currentStep}`); // LOGGING
    if (currentStep > 0) {
      console.log(`[goToPreviousStep] Moving back from step ${currentStep} to ${currentStep - 1}`); // LOGGING
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle image uploads
  const handleImagesUploaded = (urls: string[]) => {
    console.log('Images uploaded:', urls);
    
    // Create a new copy of the uploadedImages object
    const newImages: ImagePlaceholders = { ...uploadedImages };
    
    // Map the uploaded URLs to the appropriate placeholders
    const keys = Object.keys(newImages) as Array<keyof ImagePlaceholders>;
    
    // Skip the logo key as it's handled separately
    const imageKeys = keys.filter(key => key !== '{{logo}}');
    
    // Update each image placeholder with its corresponding URL
    for (let i = 0; i < Math.min(urls.length, imageKeys.length); i++) {
      newImages[imageKeys[i]] = urls[i] || '';
    }
    
    setUploadedImages(newImages);
  };

  // Handle logo upload
  const handleLogoUploaded = (url: string) => {
    console.log('Logo uploaded:', url);
    setLogoUrl(url);
  };

  // Update the handleDocumentUpload function
  const handleDocumentUpload = async (text: string) => {
    try {
      // Display loading toast
      toast.loading(t('document.extracting'), { id: "ai-extraction" });
      
      // Store raw text for later use
      setRawPropertyData(text);
      
      console.log("Starting AI extraction for:", text.substring(0, 100) + "...");
      
      // Check API key first
      const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (!apiKey) {
        toast.error(t('api.keyMissing'), { id: "ai-extraction" });
        return;
      }
      
      // Process the document text with AI
      const result = await processPropertyDescription(text);
      console.log("AI extraction result:", result);
      
      // Check if we got valid results
      if (!result) {
        toast.error(t('document.extractFailed'), { id: "ai-extraction" });
        return;
      }
      
      // Update placeholders with AI results
      const newPlaceholders: PropertyPlaceholders = { ...placeholders };
      const filledFields: string[] = [];
      
      // Loop through all placeholder fields
      Object.entries(result.placeholders || {}).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.trim() !== '') {
          // Check if the key exists in our defined placeholders before assigning
          if (key in newPlaceholders) {
             // Use type assertion carefully
             (newPlaceholders as any)[key] = value;
             filledFields.push(key);
             console.log(`Field '${key}' filled with: "${value}"`);
          } else {
             console.warn(`AI returned unknown placeholder key: ${key}`);
          }
        }
      });
      
      // *** Add logic to update priceplaceholder based on AI-extracted offer_type ***
      const extractedOfferType = result.placeholders?.offer_type;
      if (extractedOfferType === 'for_sale') {
        newPlaceholders.priceplaceholder = "Kaufpreis";
      } else if (extractedOfferType === 'for_rent') {
        newPlaceholders.priceplaceholder = "Monatliche Miete";
      } else {
        // If AI didn't return a valid offer_type, check the existing state or default
        if (placeholders.offer_type === 'for_sale') {
           newPlaceholders.priceplaceholder = "Kaufpreis";
        } else if (placeholders.offer_type === 'for_rent') {
           newPlaceholders.priceplaceholder = "Monatliche Miete";
        } else {
           newPlaceholders.priceplaceholder = ""; // Default if nothing is set
        }
      }
      console.log(`Setting priceplaceholder based on extracted offer_type (${extractedOfferType || 'N/A'}): ${newPlaceholders.priceplaceholder}`);
      // *** End priceplaceholder logic ***
      
      // Specifically log critical fields for debugging
      console.log("Title extracted:", newPlaceholders.title || "");
      console.log("Address Street extracted:", newPlaceholders.address_street || "");
      console.log("Price extracted:", newPlaceholders.price || "");
      
      // Update state with new values
      setPlaceholders(newPlaceholders);
      setAutoFilledFields(filledFields);
      
      // Show success message
      if (filledFields.length > 0) {
        toast.success(t('document.extractSuccess', { count: filledFields.length }), { id: "ai-extraction" });
        
        // Show warning if critical fields weren't extracted
        const missingCriticalFields = [];
        if (!filledFields.includes('title')) missingCriticalFields.push('Title');
        if (!filledFields.includes('address_street')) missingCriticalFields.push('Address');
        if (!filledFields.includes('price')) missingCriticalFields.push('Price');
        
        if (missingCriticalFields.length > 0) {
          toast(t('document.missingFields', { fields: missingCriticalFields.join(', ') }), { 
            duration: 5000,
            icon: '⚠️'
          });
        }
      } else {
        toast.error(t('document.noFieldsExtracted'), { id: "ai-extraction" });
      }
      
    } catch (error) {
      console.error('Error in document upload:', error);
      toast.error(t('document.extractFailed'), { id: "ai-extraction" });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    console.log(`[handleSubmit] Form submitted. Current Step: ${currentStep}, Is Last Step: ${currentStep === FORM_STEPS.length - 1}`); // LOGGING
    e.preventDefault();
    
    // Look for any active image editors and don't proceed if found
    const activeImageEditor = document.querySelector('.fixed.inset-0.z-50.flex.items-center.justify-center.bg-black.bg-opacity-80');
    if (activeImageEditor) {
      console.log('Image editor is active, not proceeding with form submission');
      return;
    }
    
    // If we're not on the final step (now Contact Info), just navigate to the next step
    if (currentStep < FORM_STEPS.length - 1) {
      console.warn(`[handleSubmit] WARNING: handleSubmit called but not on the last step (${currentStep}). This shouldn't happen with type="submit" only on the last step button.`);
      return;
    }
    
    // Ensure user is logged in
    if (!session?.user?.id) {
      setError(t('error.loginRequired'));
      console.log('[handleSubmit] User not logged in.');
      return;
    }
    
    // Only proceed with project creation if we're on the final step
    try {
      setError(null); // Clear any previous errors
      setUploadStage('uploading');
      console.log('[handleSubmit] Set upload stage to uploading.');
      
      // Validate required fields including the new cityname
      if (!placeholders.title) {
        setError(t('error.titleRequired'));
        setUploadStage('idle'); console.log('[handleSubmit] Validation failed: Title required.'); return;
      }
      if (!placeholders.address_street || !placeholders.address_house_nr || !placeholders.address_plz) {
        setError(t('error.addressRequired')); // Assuming you have a translation key for this
        setUploadStage('idle'); console.log('[handleSubmit] Validation failed: Street/Nr/PLZ required.'); return;
      }
      if (!placeholders.cityname) { // Check the new cityname field
        setError(t('error.cityRequired')); // Assuming you have a translation key for this
        setUploadStage('idle'); console.log('[handleSubmit] Validation failed: City required.'); return;
      }
       if (!placeholders.price) {
        setError(t('error.priceRequired')); // Assuming you have a translation key for this
        setUploadStage('idle'); console.log('[handleSubmit] Validation failed: Price required.'); return;
      }
      if (!selectedTemplate) {
        setError(t('error.selectTemplate'));
        setUploadStage('idle'); console.log('[handleSubmit] Validation failed: Template required.'); return;
      }
      console.log('[handleSubmit] Basic validation passed.');
      
      // Prepare images array from the image placeholders
      const presentationImages: string[] = [];
      
      // Add logo first if it exists
      if (logoUrl) {
        presentationImages.push(logoUrl);
      }
      
      // Add agent photo if it exists
      if (uploadedImages['{{agent}}']) {
        presentationImages.push(uploadedImages['{{agent}}']);
      }
      
      // Define types for the image mapping
      type PageId = 'projectOverview' | 'buildingLayout' | 'exteriorPhotos' | 'interiorPhotos' | 'floorPlan' | 'energyCertificate';
      type ImagePlaceholderKey = keyof ImagePlaceholders;
      
      // Filter and add images based on selected pages
      const imageMapping: Record<PageId, ImagePlaceholderKey[]> = {
        'projectOverview': ['{{image1}}'],
        'buildingLayout': ['{{image2}}'],
        'exteriorPhotos': ['{{image3}}', '{{image4}}'],
        'interiorPhotos': ['{{image5}}', '{{image6}}'],
        'floorPlan': ['{{image7}}'],
        'energyCertificate': ['{{image8}}']
      };

      // Add images only for selected pages
      (Object.entries(selectedPages) as [PageId, boolean][]).forEach(([pageId, isSelected]) => {
        if (isSelected && imageMapping[pageId]) {
          imageMapping[pageId].forEach(placeholder => {
            if (uploadedImages[placeholder]) {
              presentationImages.push(uploadedImages[placeholder]);
            }
          });
        }
      });
      
      console.log('Creating project with images:', presentationImages);
      console.log('Selected pages:', selectedPages);
      
      // Get user ID directly from session
      const userId = session.user.id;
      console.log(`[handleSubmit] User ID: ${userId}`);
      
      // --- BEGIN Data Transformation for Custom Placeholders ---
      const transformedPlaceholders = { ...placeholders };
      const objectType = transformedPlaceholders.object_type;

      if (objectType === 'family_house') {
        transformedPlaceholders.customp1 = i18n.getResource('de', 'translation', 'amenities.customLabel.house.p1') || 'Grundstücksgröße (m²)'; // Always German
        transformedPlaceholders.customp1value = transformedPlaceholders.property_area;
        transformedPlaceholders.customp2 = i18n.getResource('de', 'translation', 'amenities.customLabel.house.p2') || 'Anzahl Etagen'; // Always German
        transformedPlaceholders.customp2value = transformedPlaceholders.number_floors;
      } else if (objectType === 'apartment') {
        transformedPlaceholders.customp1 = i18n.getResource('de', 'translation', 'amenities.customLabel.apartment.p1') || 'Etage'; // Always German
        transformedPlaceholders.customp1value = transformedPlaceholders.floor;
        transformedPlaceholders.customp2 = i18n.getResource('de', 'translation', 'amenities.customLabel.apartment.p2') || 'Anzahl Wohneinheiten'; // Always German
        transformedPlaceholders.customp2value = transformedPlaceholders.number_units;
      } else {
        // Clear custom fields if object type is not set or invalid
        transformedPlaceholders.customp1 = '';
        transformedPlaceholders.customp1value = '';
        transformedPlaceholders.customp2 = '';
        transformedPlaceholders.customp2value = '';
      }
      // --- END Data Transformation ---
      
      // Construct a combined address string for the top-level column AND project_details
      const streetPart = [
        transformedPlaceholders.address_street,
        transformedPlaceholders.address_house_nr
      ].filter(Boolean).join(' ').trim();

      const cityPart = [
        transformedPlaceholders.address_plz,  
        transformedPlaceholders.cityname // Use cityname here
      ].filter(Boolean).join(' ').trim();

      let combinedAddress = '';
      if (streetPart && cityPart) {
        // Add comma only if both parts exist
        combinedAddress = `${streetPart}, ${cityPart}`;
      } else {
        // Otherwise, just combine whatever exists without an extra comma
        combinedAddress = `${streetPart}${cityPart}`; // No space needed as one is empty
      }
      combinedAddress = combinedAddress.trim(); // Ensure no leading/trailing spaces
      
      // Add the combined address to the details object
      transformedPlaceholders.address = combinedAddress;

      // Create the project with all the placeholders and selected pages
      console.log('[handleSubmit] Calling Supabase to insert project...');
      const { data: newProject, error: insertError } = await supabase
        .from('real_estate_projects')
        .insert({
          title: transformedPlaceholders.title || '',
          address: combinedAddress || '', // Use the newly formatted combined address
          template_id: selectedTemplate,
          user_id: userId,
          project_details: {
            ...transformedPlaceholders, // Use transformed data here (includes individual parts + combined)
            raw_property_data: rawPropertyData,
            selected_pages: selectedPages,
            page_configuration: {
              selectedPages,
              imageMapping
            }
          },
          presentation_images: presentationImages,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('[handleSubmit] Error creating project:', insertError);
        setError(insertError.message);
        setUploadStage('error');
        return;
      }
      
      console.log('[handleSubmit] Project created successfully:', newProject);
      setUploadStage('complete');
      
      // Use requestAnimationFrame to ensure state updates are complete before navigation
      requestAnimationFrame(() => {
        if (newProject) {
          console.log(`[handleSubmit] Navigating to /project/${newProject.id}`);
          router.replace(`/project/${newProject.id}`);
        }
      });
      
    } catch (error: any) {
      console.error('[handleSubmit] Error in form submission catch block:', error);
      setError(error.message || 'An unexpected error occurred');
      setUploadStage('error');
    }
  };

  // Handle template selection
  const handleTemplateSelection = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  // Add a function to handle amenities updates
  const handleAmenitiesChange = (amenities: string[]) => {
    setPlaceholders(prev => ({
      ...prev,
      amenities
    }));
  };

  // Check onboarding status - depends on session
  useEffect(() => {
    const checkOnboardingStatus = async (currentSession: Session | null) => {
      if (currentSession?.user?.id) {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .single();
        
        if (data && data.is_onboarded) {
          setIsOnboarded(true);
          setOnboardingData({
            logo: data.logo_url || '',
            brokerPhoto: data.broker_photo_url || '',
            phoneNumber: data.phone_number || '',
            emailAddress: data.email_address || '',
            websiteName: data.website_name || ''
          });
        } else {
          // Redirect to account page for onboarding
          router.push('/account');
        }
      }
    };

    if (session) {
      checkOnboardingStatus(session);
    }
  }, [session, supabase, router]);

  // Handle onboarding submit - depends on session
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const errors = {
      logo: !onboardingData.logo,
      brokerPhoto: !onboardingData.brokerPhoto,
      phoneNumber: !onboardingData.phoneNumber,
      emailAddress: !onboardingData.emailAddress || !/^\S+@\S+\.\S+$/.test(onboardingData.emailAddress),
      websiteName: !onboardingData.websiteName
    };
    
    setOnboardingErrors(errors);
    
    // Check if any errors exist
    if (Object.values(errors).some(error => error)) {
      toast.error("Please fill in all required fields correctly");
      return;
    }
    
    // Show loading state
    toast.loading("Saving your information...", { id: "onboarding" });
    
    try {
      // Save the onboarding data
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: session?.user?.id,
          logo_url: onboardingData.logo,
          broker_photo_url: onboardingData.brokerPhoto,
          phone_number: onboardingData.phoneNumber,
          email_address: onboardingData.emailAddress,
          website_name: onboardingData.websiteName,
          is_onboarded: true
        });
      
      if (error) {
        toast.error("Failed to save your information", { id: "onboarding" });
        console.error("Onboarding error:", error);
        return;
      }
      
      // Update state
      setIsOnboarded(true);
      toast.success("Information saved successfully", { id: "onboarding" });
      
      // Also update global placeholders with this information
      setPlaceholders(prev => ({
        ...prev,
        phone_number: onboardingData.phoneNumber,
        email_address: onboardingData.emailAddress,
        website_name: onboardingData.websiteName
      }));
      
      // Update logo and broker photo
      setLogoUrl(onboardingData.logo);
      const newImages = { ...uploadedImages };
      newImages['{{agent}}'] = onboardingData.brokerPhoto;
      setUploadedImages(newImages);
      
    } catch (error) {
      console.error("Error during onboarding:", error);
      toast.error("An unexpected error occurred", { id: "onboarding" });
    }
  };

  // Add these handlers for file uploads in onboarding
  const handleLogoUploadForOnboarding = (urls: string[]) => {
    if (urls.length > 0) {
      setOnboardingData(prev => ({ ...prev, logo: urls[0] }));
      setOnboardingErrors(prev => ({ ...prev, logo: false }));
    }
  };

  const handleBrokerPhotoUploadForOnboarding = (urls: string[]) => {
    if (urls.length > 0) {
      setOnboardingData(prev => ({ ...prev, brokerPhoto: urls[0] }));
      setOnboardingErrors(prev => ({ ...prev, brokerPhoto: false }));
    }
  };

  // Update uploadOnboardingImage - depends on session
  const uploadOnboardingImage = async (file: File): Promise<string> => {
    if (!session?.user?.id) {
      throw new Error("User not authenticated for image upload.");
    }
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `${timestamp}_${randomString}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;
      
      // Upload to the userinfo bucket
      const { error: uploadError } = await supabase.storage
        .from('userinfo')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('userinfo')
        .getPublicUrl(filePath);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadOnboardingImage:', error);
      throw error;
    }
  };

  // Add this handler for text input changes in onboarding
  const handleOnboardingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOnboardingData(prev => ({ ...prev, [name]: value }));
    setOnboardingErrors(prev => ({ ...prev, [name]: false }));
  };

  // Render the current step
  const renderStep = () => {
    const totalSteps = FORM_STEPS.length; // Get total number of steps dynamically

    switch (currentStep) {
      case 0:
        return <TemplateStep 
          templates={templates} 
          selectedTemplate={selectedTemplate || ''} 
          onSelect={handleTemplateSelection}
        />;
      case 1:
        return <PagesSelectionStep 
          selectedPages={selectedPages}
          onPagesChange={setSelectedPages}
        />;
      case 2:
        return (
          <BasicInfoStep 
            placeholders={placeholders} 
            handleInputChange={handleInputChange}
            handleDocumentUpload={handleDocumentUpload}
            autoFilledFields={autoFilledFields}
            docText={documentText}
            setDocText={setDocumentText}
          />
        );
      case 3:
        return (
          <DescriptionsStep
            placeholders={placeholders}
            handleInputChange={handleInputChange}
            autoFilledFields={autoFilledFields}
          />
        );
      case 4:
        return (
          <ImagesStep
            uploadedImages={uploadedImages}
            logoUrl={logoUrl}
            setUploadedImages={setUploadedImages}
            setLogoUrl={setLogoUrl}
            selectedPages={selectedPages}
          />
        );
      case 5:
        return (
          <AmenitiesStep 
            placeholders={placeholders}
            handleInputChange={handleInputChange}
          />
        );
      case 6:
        return (
          <CommissionStep
            placeholders={placeholders}
            handleInputChange={handleInputChange}
          />
        );
      case 7:
        return (
          <ContactInfoStep 
            placeholders={placeholders} 
            handleInputChange={handleInputChange}
            autoFilledFields={[
              ...autoFilledFields,
              // Add contact fields that should be considered pre-filled
              'phone_number', 
              'email_address', 
              'website_name',
              'name_brokerfirm',
              'address_brokerfirm',
              'broker_name'
            ]}
          />
        );
      default:
        return null;
    }
  };

  // Ensure profile exists - depends on session
  const ensureProfileExists = async (currentSession: Session | null) => {
    if (currentSession?.user?.id) {
      // Check if profile exists
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentSession.user.id)
        .single();
      
      // If no profile exists, create one
      if (error && error.code === 'PGRST116') { // No rows returned error
        console.log('Creating new profile for user');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: currentSession.user.id,
            credits: 0 // Start with 0 credits
          });
        
        if (insertError) {
          console.error('Error creating profile:', insertError);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-800">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  // If not onboarded, show loading state while redirecting
  if (!isOnboarded && session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-800">{t('dashboard.settingUp')}</p>
        </div>
      </div>
    );
  }

  // Regular dashboard if onboarded
  return (
    <div className="min-h-screen">
      {/* Background elements matching homepage */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div className="mr-auto">
            <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-gray-600 mt-2">{t('dashboard.subtitle')}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Credits Display */}
            <div className="flex items-center px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <svg className="w-4 h-4 mr-1.5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0116 0z" />
              </svg>
              <span className="font-medium text-gray-900 text-sm sm:text-base whitespace-nowrap">{credits ?? 0} {t('dashboard.credits')}</span>
            </div>
            
            {/* Buy Credits Button */}
            <button
              onClick={() => router.push('/dashboard/billing')}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center shadow-sm text-sm sm:text-base"
            >
              <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="whitespace-nowrap">{t('dashboard.buyCredits')}</span>
            </button>
          </div>
        </div>
        
        {/* Project Creation Form */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 sm:p-8 mb-12">
          <div className="flex items-center mb-8">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center mr-4">
              <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">{t('dashboard.createBrochure')}</h2>
          </div>
          
          {/* Form Steps Progress */}
          <div className="mb-8">
            <div className="flex overflow-x-auto pb-2 -mx-2 px-2 hide-scrollbar">
              {FORM_STEPS.map((step, index) => (
                <div 
                  key={index}
                  className={`flex flex-col items-center min-w-[100px] sm:min-w-[120px] px-2 ${
                    index === currentStep 
                      ? 'text-blue-600' 
                      : index < currentStep 
                        ? 'text-blue-500' 
                        : 'text-gray-400'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    index === currentStep 
                      ? 'bg-blue-600 text-white' 
                      : index < currentStep 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="text-xs font-medium text-center break-words">{step.title}</div>
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-100 h-1 mt-4 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / (FORM_STEPS.length - 1)) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
              {renderStep()}
            </div>
            
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={currentStep === 0}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-100 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:hover:bg-gray-100 flex items-center text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('form.previous')}
              </button>
              
              {currentStep < FORM_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="group relative inline-flex items-center overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 px-4 sm:px-6 py-2 sm:py-3 transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg focus:outline-none text-sm sm:text-base"
                >
                  <span className="absolute right-0 -mt-12 h-32 w-8 translate-x-12 rotate-12 transform bg-white opacity-10 transition-all duration-1000 ease-out group-hover:-translate-x-40"></span>
                  <span className="relative flex items-center text-white font-medium">
                    {t('form.next')}
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={uploadStage === 'uploading'}
                  className="group relative inline-flex items-center overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 px-4 sm:px-6 py-2 sm:py-3 transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg focus:outline-none disabled:opacity-70 text-sm sm:text-base"
                >
                  <span className="absolute right-0 -mt-12 h-32 w-8 translate-x-12 rotate-12 transform bg-white opacity-10 transition-all duration-1000 ease-out group-hover:-translate-x-40"></span>
                  <span className="relative flex items-center text-white font-medium">
                    {uploadStage === 'uploading' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('form.creating')}
                      </>
                    ) : (
                      <>
                        {t('form.createBrochure')}
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </>
                    )}
                  </span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;