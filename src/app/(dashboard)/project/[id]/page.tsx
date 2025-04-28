"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from "@supabase/ssr";
import Link from 'next/link';
import DocumentViewer from '@/components/DocumentViewer';
import { toast } from 'react-hot-toast';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import i18n, { forceReloadTranslations } from '@/app/i18n';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { PropertyPlaceholders, defaultPlaceholders } from '@/types/placeholders';

// Define project structure using the full placeholders type
interface Project {
  id: string;
  title: string;
  address: string; // This will be the combined address
  presentation_images: string[];
  project_details: PropertyPlaceholders; // Use the imported type
  presentation_id?: string;
  last_updated?: string;
  template_id?: string; // Add template_id if needed for DocumentViewer
  user_id?: string; // Add user_id for ownership checks
}

export default function ProjectEditor() {
  const params = useParams();
  const router = useRouter();
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));
  const [session, setSession] = useState<Session | null>(null);
  const { t } = useTranslation();
  
  const [project, setProject] = useState<Project | null>(null); // Use updated Project type
  const [error, setError] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  // Use PropertyPlaceholders for projectDetails state and initialize with defaults
  const [projectDetails, setProjectDetails] = useState<PropertyPlaceholders>(defaultPlaceholders);
  // generating state is now controlled by the callbacks
  // const [generating, setGenerating] = useState(false); 
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [i18nInitialized, setI18nInitialized] = useState(false);
  const [projectLoaded, setProjectLoaded] = useState(false);

  // Force reload translations when component mounts
  useEffect(() => {
    const loadTranslations = async () => {
      if (i18n.language) {
        const success = await forceReloadTranslations(i18n.language);
        if (success) {
          setI18nInitialized(true);
        }
      } else {
        // If no language is set, consider translations initialized anyway
        setI18nInitialized(true);
      }
    };
    
    loadTranslations();
  }, []);

  // Update loading state based on both translation and project loading
  useEffect(() => {
    if (i18nInitialized && projectLoaded && session !== undefined) {
      setIsLoading(false);
    }
  }, [i18nInitialized, projectLoaded, session]);

  // Add a timeout to ensure loading state is eventually turned off
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log("Loading timeout reached, forcing loading state to false");
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // Session handling
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log("Project Editor Auth Change: ", event, currentSession);
      setSession(currentSession);
      // Don't set isLoading false here directly, let the combined useEffect handle it
    });

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
       console.log("Project Editor Initial Session: ", initialSession);
      if (session === undefined) { // Set initial session only if not already set
         setSession(initialSession);
      }
        // Ensure loading is false eventually
        if (isLoading) {
            setIsLoading(false);
        }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]); // Keep router dependency

  // Fetch project data with security checks and trigger generation if needed
  useEffect(() => {
    const fetchProject = async (currentSession: Session | null) => {
      console.log("Fetching project with session:", currentSession);
      setProjectLoaded(false); // Reset loading state for project fetch
      try {
        if (!currentSession?.user?.id) {
          // Already handled by session listener, but good practice
          console.log("fetchProject: No user ID, skipping fetch.");
          setProjectLoaded(true); // Mark as loaded (with error/no data)
          return;
        }

        const { data: projectData, error } = await supabase
          .from('real_estate_projects')
          .select(`
            *,
            project_details
          `)
          .eq('id', params.id)
          .single();

        if (error) {
          throw error;
        }
        
        if (!projectData) {
          setError('Project not found');
          setProjectLoaded(true);
          return;
        }

        // Security check: Make sure the user owns this project
        if (projectData.user_id !== currentSession.user.id) {
          setError('You do not have permission to view this project');
          setProjectLoaded(true);
          return;
        }

        // Extract existing placeholder values from projectData.project_details if they exist
        const existingDetails = projectData.project_details || {};
        
        // Merge fetched details with defaults to ensure all keys are present
        const completeProjectDetails = { 
          ...defaultPlaceholders, 
          ...(existingDetails || {}),
          // Explicitly handle potential missing keys if needed, e.g.:
          // selected_pages: existingDetails?.selected_pages || {}
        } as PropertyPlaceholders;
        
        console.log("Complete project details after merge:", completeProjectDetails);
        
        // Build our focused project details (now using the complete type)
        const focusedDetails: PropertyPlaceholders = { 
           ...completeProjectDetails,
          // Override specific fields if they have different sources in older data
          phone_number: completeProjectDetails.phone_number || existingDetails?.phone || '', 
          email_address: completeProjectDetails.email_address || existingDetails?.email || '',
        };
        
        // Update the main project state
        setProject({
          id: projectData.id,
          title: projectData.title || '',
          address: projectData.address || '', // Combined address from top level
          presentation_images: projectData.presentation_images || [],
          project_details: focusedDetails, // Use the fully typed details
          presentation_id: projectData.presentation_id,
          last_updated: projectData.last_updated,
          template_id: projectData.template_id,
          user_id: projectData.user_id,
        });
        
        // Update the separate projectDetails state as well
        setProjectDetails(focusedDetails);
        setUploadedImages(projectData.presentation_images || []);
        
      } catch (error: any) {
        console.error('Error fetching project:', error);
        setError(error.message || 'Failed to load project data');
      } finally {
        setProjectLoaded(true);
      }
    };

    // Fetch only when session is confirmed and params.id is available
    if (session && params.id) {
      fetchProject(session);
    } else if (session === null) { // Handle case where session becomes null (logged out)
       setProjectLoaded(true); // Considered loaded, but no data
    }
  }, [params.id, supabase, session]); // Depend on session

  // Handle document processed - called by DocumentViewer
  const handleDocumentProcessed = () => {
    console.log("handleDocumentProcessed called by DocumentViewer");
    // No need to set generating states here as auto-gen is removed
    // Optionally re-fetch project data or update state if needed after manual generation
    if (session && params.id) {
      setProject(prev => prev ? ({ ...prev, presentation_id: 'generated' }) : null);
    }
  };

  const renderContent = () => {
    if (!project) {
      return (
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <p className="text-red-600">{t('project.dataNotAvailable')}</p>
          </div>
        </div>
      );
    }

    // Renamed handler for clarity - This is called by DocumentViewer
    const handlePresentationGenerated = () => {
      console.log("Presentation generated callback triggered.");
      // Update local project state to reflect that presentation exists now
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          presentation_id: prev.presentation_id || 'generated' // Mark as generated
        };
      });
    };
    
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{project.title || t('project.untitledProject')}</h1>
          <p className="text-gray-600">{project.address || t('project.noAddress')}</p>
        </div>
        
        <div className="col-span-12 relative"> {/* Add relative positioning for overlay */}
            <div className={`bg-white rounded-lg overflow-hidden border border-gray-200 shadow-md min-h-[800px]`}>
              <DocumentViewer
                projectId={params.id as string}
                placeholders={project.project_details} 
                images={uploadedImages}
                // Pass false explicitly or remove if DocumentViewer defaults correctly
                shouldProcess={false} 
                onImagesUpdate={(newImages) => setUploadedImages(newImages)} 
                onPresentationGenerated={handlePresentationGenerated}
                selectedPages={project.project_details.selected_pages}
                templateId={project.template_id || "1N-9VAQ0ecfhxiPP2qUHJFK7FMSWaR5-uJOJo6mLh2mo"} // Pass template_id from project with fallback
                // Removed onGenerationStart and onGenerationEnd props
              />
            </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]"></div>
      </div>
      
      <DashboardHeader 
        userEmail={session?.user?.email}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
      
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-300 text-red-600 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">{t('project.error')}</h2>
            <p>{error}</p>
          </div>
        ) : !project ? (
          <div className="flex items-center justify-center py-10">
            <div className="text-center">
              <p className="text-gray-600">{t('project.loadingOrNotFound')}</p>
            </div>
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
}
