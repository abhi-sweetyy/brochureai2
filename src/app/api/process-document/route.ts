import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

// Create a JWT client using the service account credentials
let auth: GoogleAuth | undefined;
try {
  // Try to parse the service account key
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY is not defined in environment variables');
  } else {
    console.log('Service account key found, attempting to parse...');
    
    // For debugging, log a small part of the key to verify it's being read
    console.log('Key starts with:', serviceAccountKey.substring(0, 20) + '...');
    
    const credentials = JSON.parse(serviceAccountKey);
    
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/presentations'
      ],
    });
    
    console.log('Google Auth initialized successfully');
  }
} catch (error) {
  console.error('Error parsing service account key:', error);
  // We'll handle this in the route handler
}

// Make sure all these placeholders are properly handled in your API endpoint:
const allPlaceholders = [
  'phone_number',
  'email_address',
  'website_name',
  'title',
  'address',
  'shortdescription',
  'price',
  'date_available', 
  'name_brokerfirm',
  'descriptionlarge',
  'descriptionextralarge',
  'address_brokerfirm',
  'broker_name'
];

// Define slide mappings based on the ACTUAL slide analysis from the logs
const pageToSlideMapping: Record<string, number[]> = {
  'projectOverview': [0],     // Slide #1 - Title page with date, price, etc.
  'buildingLayout': [1],      // Slide #2 - Lageplan (location plan) page
  'description': [2],         // Slide #3 - Description page with descriptionextralarge
  'exteriorPhotos': [3],      // Slide #4 - Exterior photos page
  'interiorPhotos': [4],      // Slide #5 - Interior photos page
  'floorPlan': [5],           // Slide #6 - Floor plan page (Grundriss)
  'energyCertificate': [6],   // Slide #7 - Energy certificate page (Energieausweis)
  'termsConditions': [7]      // Slide #8 - Terms and conditions page
};

// Mark this route as dynamic to prevent static generation errors
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log("Process presentation API called");
    
    // Check if auth was initialized properly
    if (!auth) {
      throw new Error('Failed to initialize Google authentication. Check your service account key.');
    }
    
    // Parse the request body
    let body;
    try {
      body = await request.json();
      console.log("Request body parsed:", body);
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { templateId, placeholders, images, selectedPages, language } = body;
    
    // Get the language or default to 'en'
    const userLanguage = language || 'en';
    console.log(`Using language: ${userLanguage}`);
    
    if (!templateId) {
      return NextResponse.json(
        { message: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    if (!placeholders || typeof placeholders !== 'object') {
      return NextResponse.json(
        { message: 'Placeholders must be an object' },
        { status: 400 }
      );
    }
    
    console.log("Creating Drive and Slides clients");
    
    // Create Drive and Slides clients
    const drive = google.drive({ version: 'v3', auth });
    const slides = google.slides({ version: 'v1', auth });
    
    console.log("Copying template presentation:", templateId);
    
    // Step 1: Create a copy of the template
    const copyResponse = await drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: userLanguage === 'de' ? 
          `Immobilien-Präsentation - ${new Date().toISOString()}` : 
          `Property Presentation - ${new Date().toISOString()}`,
        properties: {
          'language': userLanguage,
          'preferredLanguage': userLanguage,
          'locale': userLanguage === 'de' ? 'de_DE' : 'en_US'
        }
      }
    });
    
    console.log("Copy response:", copyResponse.data);
    
    const newPresentationId = copyResponse.data.id;
    
    if (!newPresentationId) {
      throw new Error('Failed to create presentation copy');
    }
    
    console.log("Making presentation publicly accessible:", newPresentationId);
    
    // Make the presentation publicly accessible with editing permissions and set language again
    await drive.permissions.create({
      fileId: newPresentationId,
      requestBody: {
        role: 'writer',
        type: 'anyone'
      }
    });
    
    // Set language property on file metadata (may help with language settings)
    console.log(`Setting language property to ${userLanguage} on presentation`);
    await drive.files.update({
      fileId: newPresentationId,
      requestBody: {
        properties: {
          'language': userLanguage,
          'preferredLanguage': userLanguage,
          'locale': userLanguage === 'de' ? 'de_DE' : 'en_US',
          'ui_language': userLanguage
        }
      }
    });
    
    // Get the presentation content
    console.log("Fetching presentation content:", newPresentationId);
    const presentation = await slides.presentations.get({
      presentationId: newPresentationId
    });
    
    console.log("Presentation content retrieved");
    
    // Create an array of requests for text replacements and slide deletions
    const requests = [];
    
    // Ensure all expected placeholders have values (use empty string if not provided)
    const processedPlaceholders: Record<string, string> = {};
    
    // Populate all placeholders with values from the request, or empty strings
    allPlaceholders.forEach(placeholder => {
      processedPlaceholders[placeholder] = placeholders[placeholder] || '';
    });
    
    // Process the special shortdescription placeholder if needed
    if (placeholders.Realestate_type && placeholders.rent_or_sale && !processedPlaceholders.shortdescription) {
      processedPlaceholders.shortdescription = 
        `${placeholders.Realestate_type} for ${placeholders.rent_or_sale} in ${placeholders.address || 'this location'}`;
    }
    
    // Map placeholders to your template placeholders
    const placeholderMap: Record<string, string> = {
      '{title}': processedPlaceholders.title || '',
      '{phone_number}': processedPlaceholders.phone_number || '',
      '{email_address}': processedPlaceholders.email_address || '',
      '{website_name}': processedPlaceholders.website_name || '',
      '{address}': processedPlaceholders.address || '',
      '{shortdescription}': processedPlaceholders.shortdescription || '',
      '{price}': processedPlaceholders.price || '',
      '{date_available}': processedPlaceholders.date_available || '',
      '{name_brokerfirm}': processedPlaceholders.name_brokerfirm || '',
      '{descriptionlarge}': processedPlaceholders.descriptionlarge || '',
      '{descriptionextralarge}': processedPlaceholders.descriptionextralarge || '',
      '{address_brokerfirm}': processedPlaceholders.address_brokerfirm || '',
      '{broker_name}': processedPlaceholders.broker_name || ''
    };
    
    // For each placeholder, create a replace text request
    for (const [placeholder, value] of Object.entries(placeholderMap)) {
      console.log(`Creating replacement request for ${placeholder}`);
      
      requests.push({
        replaceAllText: {
          containsText: {
            text: placeholder,
            matchCase: true
          },
          replaceText: value
        }
      });
    }
    
    // Process image replacements if provided
    if (images && typeof images === 'object' && Object.keys(images).length > 0) {
      // First, we need to find all image elements in the presentation
      const imageElements: any[] = [];
      
      // Iterate through all slides
      presentation.data.slides?.forEach((slide, slideIndex) => {
        // Iterate through all page elements on the slide
        slide.pageElements?.forEach(element => {
          // Check if this is an image element
          if (element.image && element.objectId) {
            imageElements.push({
              objectId: element.objectId,
              title: element.title || '',
              slideIndex
            });
          }
        });
      });
      
      console.log(`Found ${imageElements.length} image elements in the presentation`);
      
      // Match image elements with provided image URLs
      Object.entries(images).forEach(([key, imageUrl]) => {
        // Format the image placeholder with double curly braces
        const placeholder = `{{${key}}}`;
        
        console.log(`Looking for image elements with title containing: ${placeholder}`);
        
        // Find image elements with a title matching the placeholder
        const matchingImages = imageElements.filter(img => 
          img.title.includes(placeholder)
        );
        
        console.log(`Found ${matchingImages.length} matching image elements for ${placeholder}`);
        
        matchingImages.forEach(img => {
          console.log(`Creating image replacement for: ${img.objectId} -> ${imageUrl}`);
          
          // Add a request to replace the image
          requests.push({
            replaceImage: {
              imageObjectId: img.objectId,
              url: String(imageUrl),
              imageReplaceMethod: 'CENTER_INSIDE'
            }
          });
        });
      });
    }
    
    // Handle slide deletion for unchecked pages
    if (selectedPages && typeof selectedPages === 'object') {
      console.log("Processing selectedPages to remove unchecked slides:", selectedPages);
      
      // Collect all slide IDs to delete (for unchecked pages)
      const slideIdsToDelete: string[] = [];
      
      if (presentation.data.slides) {
        // Get total number of slides for debugging
        console.log(`Template has ${presentation.data.slides.length} slides total`);
        
        // Enhanced slide analysis to better understand content
        console.log("========= DETAILED SLIDE ANALYSIS =========");
        presentation.data.slides.forEach((slide, index) => {
          // Extract all text from this slide
          let slideText = '';
          let imgCount = 0;
          
          slide.pageElements?.forEach(element => {
            // Extract text from shapes
            if (element.shape?.text) {
              const elementText = element.shape.text.textElements
                ?.map(textElement => textElement.textRun?.content || '')
                .join('');
              slideText += elementText + ' ';
            }
            
            // Count images
            if (element.image) {
              imgCount++;
            }
          });
          
          // Clean up and truncate text for logging
          slideText = slideText.replace(/\s+/g, ' ').trim();
          const truncatedText = slideText.length > 100 ? slideText.substring(0, 100) + '...' : slideText;
          
          console.log(`Slide #${index + 1} (index ${index}) - ID: ${slide.objectId} - ${imgCount} images - Text: "${truncatedText}"`);
        });
        console.log("==========================================");
        
        // Process each page in our mapping to see if it should be removed
        Object.entries(pageToSlideMapping).forEach(([pageId, slideIndices]) => {
          const isPageSelected = selectedPages[pageId] === true;
          console.log(`Page "${pageId}" - Selected: ${isPageSelected}, Mapped to slides:`, slideIndices);
          
          // If this page is NOT selected, queue its slides for deletion
          if (!isPageSelected) {
            slideIndices.forEach(slideIndex => {
              // Verify the slide index is valid
              if (slideIndex >= 0 && slideIndex < presentation.data.slides!.length) {
                const slideId = presentation.data.slides![slideIndex].objectId;
                if (slideId) {
                  slideIdsToDelete.push(slideId);
                  console.log(`WILL DELETE: Slide #${slideIndex + 1} (index ${slideIndex}) for unchecked page "${pageId}" - ID: ${slideId}`);
                }
              } else {
                console.log(`WARNING: Invalid slide index ${slideIndex} for page "${pageId}"`);
              }
            });
          }
        });
        
        // Add delete requests for each slide to be removed
        slideIdsToDelete.forEach(slideId => {
          requests.push({
            deleteObject: {
              objectId: slideId
            }
          });
        });
        
        console.log(`Added ${slideIdsToDelete.length} slide deletion requests for slides:`, slideIdsToDelete);
      }
    }
    
    console.log(`Created ${requests.length} update requests`);
    
    // Inspect the presentation content
    console.log("Inspecting presentation for text elements containing '{descriptionlarge}'");
    let foundPlaceholders: { slideIndex: number; text: string }[] = [];
    presentation.data.slides?.forEach((slide, slideIndex) => {
      slide.pageElements?.forEach(element => {
        if (element.shape && element.shape.text) {
          const textContent = element.shape.text.textElements
            ?.map(textElement => textElement.textRun?.content || '')
            .join('');
          // Look for the exact format with curly braces
          if (textContent && textContent.includes('{descriptionlarge}')) {
            console.log(`Found '{descriptionlarge}' on slide ${slideIndex + 1}: "${textContent.substring(0, 100)}..."`);
            foundPlaceholders.push({
              slideIndex,
              text: textContent.substring(0, 100)
            });
          }
        }
      });
    });
    console.log(`Found ${foundPlaceholders.length} instances of '{descriptionlarge}'`);
    console.log("Placeholder text found:", foundPlaceholders);
    
    if (requests.length > 0) {
      console.log(`Sending batch update with ${requests.length} replacements`);
      
      try {
        const updateResponse = await slides.presentations.batchUpdate({
          presentationId: newPresentationId,
          requestBody: {
            requests: requests
          }
        });
        
        console.log("Batch update response:", updateResponse.data);
      } catch (error) {
        console.error("Error during batch update:", error);
        // Continue execution even if batch update fails
      }
    }
    
    console.log("Presentation processed successfully");
    
    // Build URLs with explicit language parameters - make language the primary parameter
    const userLang = userLanguage === 'de' ? 'de' : 'en';
    
    // For German, create a URL that forces German interface
    let editUrl = '';
    if (userLang === 'de') {
      // For German, use these specific parameters that are known to force German UI
      editUrl = `https://docs.google.com/presentation/d/${newPresentationId}/edit?hl=de&usp=sharing&ui=2&authuser=0`;
    } else {
      // For English, use standard parameters
      editUrl = `https://docs.google.com/presentation/d/${newPresentationId}/edit?hl=en&usp=sharing`;
    }
    
    const viewUrl = `https://docs.google.com/presentation/d/${newPresentationId}/view?hl=${userLang}`;
    
    return NextResponse.json({ 
      documentId: newPresentationId,
      viewUrl: viewUrl,
      editUrl: editUrl,
      language: userLanguage
    });
  } catch (error: any) {
    console.error('Error processing presentation:', error);
    
    // Ensure we return a proper JSON response even for unexpected errors
    return NextResponse.json(
      { 
        message: error.message || 'Failed to process presentation',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        details: error.response?.data || error.details || undefined
      },
      { status: 500 }
    );
  }
}