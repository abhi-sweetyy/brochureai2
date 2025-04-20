"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from "@supabase/ssr";
import Link from 'next/link';
import DocumentViewer from '@/components/DocumentViewer';
import ImageUploader from '@/components/ImageUploader';
import { toast } from 'react-hot-toast';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import i18n, { forceReloadTranslations } from '@/app/i18n';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

// Define only the fields we need for our placeholders
interface Project {
  id: string;
  title: string;
  address: string;
  presentation_images: string[];
  project_details: {
    phone_number?: string;
    email_address?: string;
    website_name?: string;
    // title is from the main project
    // address is from the main project
    shortdescription?: string;
    price?: string;
    date_available?: string;
    name_brokerfirm?: string;
    descriptionlarge?: string;
    descriptionextralarge?: string;
    address_brokerfirm?: string;
    amenities?: string[];
    selected_pages?: Record<string, boolean>;
  };
  presentation_id?: string;
  last_updated?: string;
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
  
  const [project, setProject] = useState<Project | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [projectDetails, setProjectDetails] = useState<Project['project_details']>({
    amenities: []
  });
  const [shouldProcessDocument, setShouldProcessDocument] = useState(false);
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic-info');
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  // Fetch project data with security checks
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
        
        // Build our focused project details with just what we need
        const focusedDetails: Project['project_details'] = {
          phone_number: existingDetails.phone_number || existingDetails.phone || '',
          email_address: existingDetails.email_address || existingDetails.email || '',
          website_name: existingDetails.website_name || existingDetails.website || '',
          shortdescription: existingDetails.shortdescription || existingDetails.summary || '',
          price: existingDetails.price || '',
          date_available: existingDetails.date_available || existingDetails.yearofconstruction || '',
          name_brokerfirm: existingDetails.name_brokerfirm || '',
          descriptionlarge: existingDetails.descriptionlarge || existingDetails.layoutdescription || '',
          descriptionextralarge: existingDetails.descriptionextralarge || existingDetails.summary || '',
          address_brokerfirm: existingDetails.address_brokerfirm || projectData.address || '',
          amenities: existingDetails.amenities || [],
          selected_pages: existingDetails.selected_pages || {}
        };
        
        // Create a focused project object with only what we need
        const focusedProject = {
          id: projectData.id,
          title: projectData.title,
          address: projectData.address,
          presentation_images: projectData.presentation_images || [],
          project_details: focusedDetails,
          presentation_id: projectData.presentation_id,
          last_updated: projectData.last_updated
        };

        setProject(focusedProject);
        setUploadedImages(focusedProject.presentation_images);
        setProjectDetails(focusedDetails);
        
        // Set the placeholders based on our focused data structure
        setPlaceholders({
          'phone_number': focusedDetails.phone_number || '',
          'email_address': focusedDetails.email_address || '',
          'website_name': focusedDetails.website_name || '',
          'title': projectData.title || '',
          'address': projectData.address || '',
          'shortdescription': focusedDetails.shortdescription || '',
          'price': focusedDetails.price || '',
          'date_available': focusedDetails.date_available || '',
          'name_brokerfirm': focusedDetails.name_brokerfirm || '',
          'descriptionlarge': focusedDetails.descriptionlarge || '',
          'descriptionextralarge': focusedDetails.descriptionextralarge || '',
          'address_brokerfirm': focusedDetails.address_brokerfirm || ''
        });
        
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

  // Handle input change - updating both projectDetails and placeholders
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    console.log(`Updating ${name} with value: ${value.substring(0, 30)}...`);
    
    // Update project details with functional update
    setProjectDetails(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Update placeholders directly with functional update
    setPlaceholders(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle title/address changes which are special cases
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Functional update for project state
    setProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        title: value
      };
    });
    
    // Functional update for placeholders
    setPlaceholders(prev => ({
      ...prev, 
      title: value
    }));
  };
  
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Functional update for project state
    setProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        address: value
      };
    });
    
    // Functional update for placeholders
    setPlaceholders(prev => ({
      ...prev, 
      address: value,
      address_brokerfirm: value
    }));
  };

  // Handle saving the focused project details
  const handleSave = async () => {
    if (!session?.user?.id || !project) {
      console.log("Save aborted: No session or project data");
      router.replace('/sign-in');
      return;
    }
    
    try {
      setUpdating(true);
      
      // Security check: Verify ownership before update
      const { data: projectCheck, error: checkError } = await supabase
        .from('real_estate_projects')
        .select('user_id')
        .eq('id', params.id)
        .single();
        
      if (checkError) throw checkError;
      
      if (!projectCheck || projectCheck.user_id !== session.user.id) {
        setError('You do not have permission to update this project');
        setUpdating(false);
        return;
      }
      
      // Prepare update payload - IMPORTANT: don't modify original project details structure
      const { data: currentProject } = await supabase
        .from('real_estate_projects')
        .select('project_details')
        .eq('id', project.id)
        .single();
      
      // Create a new object with current project details as base
      const updatedProjectDetails = {
        ...(currentProject?.project_details || {}),
        // Update only our specific placeholders
        phone_number: projectDetails.phone_number,
        email_address: projectDetails.email_address,
        website_name: projectDetails.website_name,
        shortdescription: projectDetails.shortdescription,
        price: projectDetails.price,
        date_available: projectDetails.date_available,
        name_brokerfirm: projectDetails.name_brokerfirm,
        descriptionlarge: projectDetails.descriptionlarge,
        descriptionextralarge: projectDetails.descriptionextralarge,
        address_brokerfirm: projectDetails.address_brokerfirm,
        selected_pages: currentProject?.project_details?.selected_pages || {} // Preserve selected pages
      };
      
      const updatePayload = {
        title: project.title,
        address: project.address,
        project_details: updatedProjectDetails,
        presentation_images: uploadedImages,
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('real_estate_projects')
        .update(updatePayload)
        .eq('id', project.id);

      if (error) throw error;
      
      // Update local state safely with the new data
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          title: project.title,
          address: project.address,
          project_details: {
            ...prev.project_details,
            ...projectDetails
          },
          presentation_images: uploadedImages,
          last_updated: new Date().toISOString()
        };
      });
      
      toast.success('Project saved successfully');
    } catch (error) {
      console.error('Error saving project:', error);
      setError('Failed to save project');
      toast.error('Failed to save project');
    } finally {
      setUpdating(false);
    }
  };

  // Handle image upload
  const handleImagesUploaded = async (urls: string[]) => {
    if (!params.id) return; // Ensure project id is available
    try {
      setUploading(true);
      
      // Combine existing images with new ones
      const newImages = [...uploadedImages, ...urls];
      
      // Update the project in the database
      const { data: updateData, error: updateError } = await supabase
        .from('real_estate_projects')
        .update({ 
          presentation_images: newImages,
          last_updated: new Date().toISOString()
        })
        .eq('id', params.id)
        .select();
      
      if (updateError) {
        throw updateError;
      }
      
      // Only update the state after successful database update
      setUploadedImages(newImages);
      toast.success('Images uploaded successfully');
      
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  // Handle image removal
  const handleImageRemove = async (index: number) => {
    if (!params.id) return; // Ensure project id is available
    try {
      setUploading(true);
      
      // Get the image URL to be removed
      const imageToRemove = uploadedImages[index];
      
      // Create new array without the removed image
      const newImages = uploadedImages.filter((_, i) => i !== index);
      
      // Update the project in the database
      const { data: updateData, error: updateError } = await supabase
        .from('real_estate_projects')
        .update({ 
          presentation_images: newImages,
          last_updated: new Date().toISOString()
        })
        .eq('id', params.id)
        .select();
      
      if (updateError) {
        throw updateError;
      }
      
      // Update state
      setUploadedImages(newImages);
      
      // Try to delete the file from storage
      if (imageToRemove) {
        try {
          const urlParts = imageToRemove.split('/');
          const bucketNameIndex = urlParts.findIndex(part => part === 'docx');
          
          if (bucketNameIndex >= 0 && bucketNameIndex < urlParts.length - 1) {
            const filePath = urlParts.slice(bucketNameIndex + 1).join('/').split('?')[0];
            
            await supabase.storage
              .from('docx')
              .remove([filePath]);
          }
        } catch (deleteError) {
          console.error('Error deleting file from storage:', deleteError);
        }
      }
      
      toast.success('Image removed successfully');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  // Handle document generation
  const handleGenerateDocument = () => {
    setGenerating(true);
    setShouldProcessDocument(true);
  };

  // Handle document processed
  const handleDocumentProcessed = () => {
    setGenerating(false);
    setShouldProcessDocument(false);
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

    // Add handler for presentation generation
    const handlePresentationGenerated = () => {
      // Use functional update to prevent race conditions
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          presentation_id: 'generated'
        };
      });
    };

    return (
      <>
        <h1 className="text-2xl font-bold text-gray-900">{project.title || t('project.untitledProject')}</h1>
        <p className="text-gray-600">{project.address || t('project.noAddress')}</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          {!project.presentation_id && (
            <div className="lg:col-span-7">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8 shadow-md">
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('basic-info')}
                    className={`flex-1 py-4 px-4 text-center text-sm font-medium ${
                      activeTab === 'basic-info' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {t('project.propertyInfo')}
                  </button>
                  <button
                    onClick={() => setActiveTab('descriptions')}
                    className={`flex-1 py-4 px-4 text-center text-sm font-medium ${
                      activeTab === 'descriptions' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {t('project.descriptions')}
                  </button>
                  <button
                    onClick={() => setActiveTab('images')}
                    className={`flex-1 py-4 px-4 text-center text-sm font-medium ${
                      activeTab === 'images' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {t('project.images')}
                  </button>
                </div>

                <div className="p-6">
                  {activeTab === 'basic-info' && (
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.propertyTitle')}
                        </label>
                        <input
                          type="text"
                          id="title"
                          name="title"
                          value={project.title || ''}
                          onChange={handleTitleChange}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.propertyAddress')}
                        </label>
                        <input
                          type="text"
                          id="address"
                          name="address"
                          value={project.address || ''}
                          onChange={handleAddressChange}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.price')}
                        </label>
                        <input
                          type="text"
                          id="price"
                          name="price"
                          value={projectDetails.price || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="date_available" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.dateAvailable')}
                        </label>
                        <input
                          type="text"
                          id="date_available"
                          name="date_available"
                          value={projectDetails.date_available || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.phoneNumber')}
                        </label>
                        <input
                          type="text"
                          id="phone_number"
                          name="phone_number"
                          value={projectDetails.phone_number || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email_address" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.emailAddress')}
                        </label>
                        <input
                          type="email"
                          id="email_address"
                          name="email_address"
                          value={projectDetails.email_address || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="website_name" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.website')}
                        </label>
                        <input
                          type="text"
                          id="website_name"
                          name="website_name"
                          value={projectDetails.website_name || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="name_brokerfirm" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.brokerFirmName')}
                        </label>
                        <input
                          type="text"
                          id="name_brokerfirm"
                          name="name_brokerfirm"
                          value={projectDetails.name_brokerfirm || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="address_brokerfirm" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.brokerFirmAddress')}
                        </label>
                        <input
                          type="text"
                          id="address_brokerfirm"
                          name="address_brokerfirm"
                          value={projectDetails.address_brokerfirm || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'descriptions' && (
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="shortdescription" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.shortDescription')}
                        </label>
                        <textarea
                          id="shortdescription"
                          name="shortdescription"
                          value={projectDetails.shortdescription || ''}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={t('project.briefDescriptionPlaceholder')}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="descriptionlarge" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.layoutDescription')}
                        </label>
                        <textarea
                          id="descriptionlarge"
                          name="descriptionlarge"
                          value={projectDetails.descriptionlarge || ''}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={t('project.detailedLayoutPlaceholder')}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="descriptionextralarge" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('project.detailedDescription')}
                        </label>
                        <textarea
                          id="descriptionextralarge"
                          name="descriptionextralarge"
                          value={projectDetails.descriptionextralarge || ''}
                          onChange={handleInputChange}
                          rows={6}
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={t('project.comprehensiveDescriptionPlaceholder')}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'images' && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p className="text-blue-700">
                          {t('project.uploadImagesInfo')}
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('project.propertyImages')}</h3>
                        <ImageUploader
                          images={uploadedImages}
                          onUpload={handleImagesUploaded}
                          onRemove={handleImageRemove}
                          uploading={uploading}
                          limit={10}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between p-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      if (activeTab === 'descriptions') setActiveTab('basic-info');
                      else if (activeTab === 'images') setActiveTab('descriptions');
                    }}
                    disabled={activeTab === 'basic-info'}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      activeTab === 'basic-info'
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {t('project.previous')}
                  </button>
                  
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    disabled={updating}
                    className="group relative inline-flex items-center overflow-hidden rounded-md bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-2 text-white transition-all duration-300 ease-out hover:shadow-lg focus:outline-none disabled:opacity-70"
                  >
                    {updating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('project.saving')}
                      </>
                    ) : (
                      <>{t('project.saveChanges')}</>
                    )}
                  </motion.button>
                  
                  <button
                    onClick={() => {
                      if (activeTab === 'basic-info') setActiveTab('descriptions');
                      else if (activeTab === 'descriptions') setActiveTab('images');
                    }}
                    disabled={activeTab === 'images'}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      activeTab === 'images'
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {t('project.next')}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className={`${project.presentation_id ? 'lg:col-span-12' : 'lg:col-span-5'} transition-all duration-300`}>
            <div className={`bg-white rounded-lg overflow-hidden border border-gray-200 shadow-md sticky top-8 ${project.presentation_id ? 'min-h-[800px]' : 'h-full'}`}>
              <DocumentViewer
                projectId={params.id as string}
                placeholders={placeholders}
                images={uploadedImages}
                shouldProcess={shouldProcessDocument}
                onImagesUpdate={(newImages) => setUploadedImages(newImages)}
                onPresentationGenerated={handlePresentationGenerated}
                selectedPages={projectDetails.selected_pages}
              />
            </div>
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
