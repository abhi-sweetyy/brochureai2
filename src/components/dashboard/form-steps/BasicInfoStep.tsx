"use client";

import React, { useState, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
import { toast } from 'react-hot-toast';
import { PropertyPlaceholders } from '@/types/placeholders';
import { useTranslation } from 'react-i18next';
import i18n from '@/app/i18n';
import { useLanguage } from '@/app/contexts/LanguageContext';

interface BasicInfoStepProps {
  placeholders: PropertyPlaceholders;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleDocumentUpload: (text: string) => Promise<void>;
  autoFilledFields: string[];
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ 
  placeholders, 
  handleInputChange,
  handleDocumentUpload,
  autoFilledFields
}) => {
  const { t, i18n: translationInstance } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [docText, setDocText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, forceUpdate] = useState({});

  // Force component to re-render when language changes
  useEffect(() => {
    console.log("Language in BasicInfoStep changed to:", currentLanguage);
    console.log("BasicInfoStep i18n instance language:", translationInstance.language);
    console.log("Global i18n instance language:", i18n.language);
    // Force component re-render to ensure translations are updated
    forceUpdate({});
  }, [currentLanguage, translationInstance.language]);

  useEffect(() => {
    console.log("BasicInfoStep rendered with placeholders:", placeholders);
    console.log("Auto-filled fields:", autoFilledFields);
    
    // Check if any key is showing the actual key instead of translation
    const documentTitle = t('basicInfo.documentTitle');
    console.log("Translation test - documentTitle:", documentTitle);
    if (documentTitle === 'basicInfo.documentTitle') {
      console.warn("Translation not working correctly - showing key instead of value");
    }
  }, [placeholders, autoFilledFields, t]);

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDocText(e.target.value);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setUploadError(null);

      // Process different file types
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setDocText(result.value);
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.rtf')) {
        const text = await file.text();
        setDocText(text);
      } else {
        setUploadError(t('basicInfo.fileTypeError'));
        setIsProcessing(false);
        return;
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadError(t('basicInfo.processError'));
      setIsProcessing(false);
    }
  };

  const processDocument = async () => {
    if (!docText.trim()) {
      setUploadError(t('basicInfo.emptyDocError'));
      return;
    }

    try {
      setIsProcessing(true);
      setUploadError(null);
      
      console.log("Processing document with text:", docText.substring(0, 50) + "...");
      
      try {
        await handleDocumentUpload(docText);
        console.log("Document processed successfully");
      } catch (error) {
        console.error('Error processing document:', error);
        setUploadError(t('basicInfo.aiProcessError'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const regenerateCriticalFields = async () => {
    if (!docText.trim()) {
      setUploadError(t('basicInfo.noTextForRegeneration'));
      return;
    }

    try {
      setIsProcessing(true);
      toast.loading(t('basicInfo.regeneratingFields'), { id: "regenerate" });
      
      // Get the API key from environment variables
      const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      
      if (!apiKey) {
        toast.error(t('api.keyMissing'), { id: "regenerate" });
        setUploadError(t('api.keyMissing'));
        setIsProcessing(false);
        return;
      }
      
      // Send a targeted request to extract just title, address and price
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Critical Fields Extractor'
        },
        body: JSON.stringify({
          model: 'qwen/qwen2.5-vl-72b-instruct:free', // More reliable model
          messages: [
            {
              role: 'system',
              content: `Extract ONLY these three critical fields from the real estate property text:
1. TITLE: A professional property title that includes property type and main feature.
2. ADDRESS: The complete property address or location.
3. PRICE: The property price with currency.

Output ONLY a JSON object with these three fields exactly. If information is not found, use an empty string.`
            },
            {
              role: 'user',
              content: docText
            }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        }),
      });
      
      if (!response.ok) {
        console.error(`API request failed with status ${response.status}`);
        toast.error(`${t('api.requestFailed')} ${response.status}`, { id: "regenerate" });
        setUploadError(`${t('api.requestFailed')} ${response.status}`);
        setIsProcessing(false);
        return;
      }
      
      const data = await response.json();
      
      if (!data?.choices?.[0]?.message?.content) {
        console.error("Invalid response format from AI service");
        toast.error(t('api.invalidResponse'), { id: "regenerate" });
        setUploadError(t('api.invalidResponse'));
        setIsProcessing(false);
        return;
      }
      
      let extractedContent;
      try {
        const content = data.choices[0].message.content;
        console.log("Raw AI response:", content.substring(0, 200));
        
        if (typeof content !== 'string') {
          throw new Error("Content is not a string");
        }
        
        extractedContent = JSON.parse(content.trim());
        console.log("Regenerated fields:", extractedContent);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        toast.error(t('api.parseError'), { id: "regenerate" });
        setUploadError(t('api.parseError'));
        setIsProcessing(false);
        return;
      }
      
      // Only update fields that were successfully extracted
      let updatedCount = 0;
      
      if (extractedContent.title && typeof extractedContent.title === 'string') {
        const titleEvent = {
          target: {
            name: 'title',
            value: extractedContent.title
          }
        } as React.ChangeEvent<HTMLInputElement>;
        handleInputChange(titleEvent);
        updatedCount++;
      }
      
      if (extractedContent.address && typeof extractedContent.address === 'string') {
        const addressEvent = {
          target: {
            name: 'address',
            value: extractedContent.address
          }
        } as React.ChangeEvent<HTMLInputElement>;
        handleInputChange(addressEvent);
        updatedCount++;
      }
      
      if (extractedContent.price && typeof extractedContent.price === 'string') {
        const priceEvent = {
          target: {
            name: 'price',
            value: extractedContent.price
          }
        } as React.ChangeEvent<HTMLInputElement>;
        handleInputChange(priceEvent);
        updatedCount++;
      }
      
      if (updatedCount > 0) {
        toast.success(t('basicInfo.fieldsRegenerated', { count: updatedCount }), { id: "regenerate" });
      } else {
        toast.error(t('basicInfo.noFieldsExtracted'), { id: "regenerate" });
        setUploadError(t('basicInfo.noFieldsExtracted'));
      }
      
    } catch (error) {
      console.error("Error regenerating fields:", error);
      toast.error(t('basicInfo.regenerationError'), { id: "regenerate" });
      setUploadError(t('basicInfo.regenerationError'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
        <h3 className="text-gray-800 text-lg font-medium mb-4">{t('basicInfo.documentTitle')}</h3>
        <p className="text-gray-600 mb-4">{t('basicInfo.uploadInstructions')}</p>
        
        <div className="mb-4">
          <div className="flex items-center justify-center w-full">
            <label 
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 border-gray-300 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p className="mb-2 text-sm text-gray-600"><span className="font-semibold">{t('basicInfo.clickToUpload')}</span> {t('basicInfo.dragDrop')}</p>
                <p className="text-xs text-gray-500">{t('basicInfo.supportedFormats')}</p>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept=".docx,.txt,.rtf" 
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 text-sm mb-2">{t('basicInfo.orPaste')}</p>
          <textarea
            value={docText}
            onChange={handleTextAreaChange}
            rows={10}
            className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('basicInfo.pasteHere')}
          ></textarea>
        </div>
        
        {uploadError && (
          <div className="bg-red-100 border border-red-300 text-red-600 p-3 rounded-md mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{uploadError}</span>
          </div>
        )}
        
        <button
          type="button"
          onClick={processDocument}
          disabled={isProcessing || !docText.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:hover:bg-blue-600"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('basicInfo.processing')}
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              {t('basicInfo.extractInfo')}
            </>
          )}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-gray-800 text-lg font-medium mb-4">{t('basicInfo.requiredInfo')}</h3>
        <p className="text-gray-600 mb-4">{t('basicInfo.fillEdit')}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              {t('basicInfo.propertyTitle')}*
              {autoFilledFields.includes('title') && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t('basicInfo.aiFilled')}</span>
              )}
            </label>
            <input
              type="text"
              name="title"
              value={placeholders.title || ''}
              onChange={handleInputChange}
              className={`w-full rounded-md px-3 py-2 text-gray-800 ${
                autoFilledFields.includes('title') 
                  ? 'bg-blue-50 border border-blue-300' 
                  : 'bg-white border border-gray-300'
              }`}
              placeholder={t('basicInfo.enterTitle')}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              {t('basicInfo.address')}*
              {autoFilledFields.includes('address') && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t('basicInfo.aiFilled')}</span>
              )}
            </label>
            <input
              type="text"
              name="address"
              value={placeholders.address || ''}
              onChange={handleInputChange}
              className={`w-full rounded-md px-3 py-2 text-gray-800 ${
                autoFilledFields.includes('address') 
                  ? 'bg-blue-50 border border-blue-300' 
                  : 'bg-white border border-gray-300'
              }`}
              placeholder={t('basicInfo.enterAddress')}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              {t('basicInfo.shortDescription')}
              {autoFilledFields.includes('shortdescription') && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t('basicInfo.aiFilled')}</span>
              )}
            </label>
            <textarea
              name="shortdescription"
              value={placeholders.shortdescription || ''}
              onChange={handleInputChange}
              className={`w-full rounded-md px-3 py-2 text-gray-800 ${
                autoFilledFields.includes('shortdescription') 
                  ? 'bg-blue-50 border border-blue-300' 
                  : 'bg-white border border-gray-300'
              }`}
              placeholder={t('basicInfo.enterShortDescription')}
              rows={2}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              {t('basicInfo.price')}*
              {autoFilledFields.includes('price') && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t('basicInfo.aiFilled')}</span>
              )}
            </label>
            <input
              type="text"
              name="price"
              value={placeholders.price || ''}
              onChange={handleInputChange}
              className={`w-full rounded-md px-3 py-2 text-gray-800 ${
                autoFilledFields.includes('price') 
                  ? 'bg-blue-50 border border-blue-300' 
                  : 'bg-white border border-gray-300'
              }`}
              placeholder={t('basicInfo.enterPrice')}
              required
            />
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            {t('basicInfo.dateAvailable')}
            {autoFilledFields.includes('date_available') && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t('basicInfo.aiFilled')}</span>
            )}
          </label>
          <input
            type="text"
            name="date_available"
            value={placeholders.date_available || ''}
            onChange={handleInputChange}
            className={`w-full rounded-md px-3 py-2 text-gray-800 ${
              autoFilledFields.includes('date_available') 
                ? 'bg-blue-50 border border-blue-300' 
                : 'bg-white border border-gray-300'
            }`}
            placeholder={t('basicInfo.enterDateAvailable')}
          />
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              {t('basicInfo.sitePlanDescription')}
              {autoFilledFields.includes('descriptionlarge') && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t('basicInfo.aiFilled')}</span>
              )}
            </label>
            <textarea
              name="descriptionlarge"
              value={placeholders.descriptionlarge || ''}
              onChange={handleInputChange}
              className={`w-full rounded-md px-3 py-2 text-gray-800 ${
                autoFilledFields.includes('descriptionlarge') 
                  ? 'bg-blue-50 border border-blue-300' 
                  : 'bg-white border border-gray-300'
              }`}
              placeholder={t('basicInfo.enterSitePlanDescription')}
              rows={4}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              {t('basicInfo.detailedDescription')}
              {autoFilledFields.includes('descriptionextralarge') && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t('basicInfo.aiFilled')}</span>
              )}
            </label>
            <textarea
              name="descriptionextralarge"
              value={placeholders.descriptionextralarge || ''}
              onChange={handleInputChange}
              className={`w-full rounded-md px-3 py-2 text-gray-800 ${
                autoFilledFields.includes('descriptionextralarge') 
                  ? 'bg-blue-50 border border-blue-300' 
                  : 'bg-white border border-gray-300'
              }`}
              placeholder={t('basicInfo.enterDetailedDescription')}
              rows={8}
              style={{ whiteSpace: 'pre-wrap' }}
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={regenerateCriticalFields}
            disabled={isProcessing || !docText.trim()}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('basicInfo.regenerateCriticalFields')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep; 