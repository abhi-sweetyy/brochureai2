"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PropertyPlaceholders } from '@/types/placeholders';

interface DescriptionsStepProps {
  placeholders: PropertyPlaceholders;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  autoFilledFields?: string[];
}

const DescriptionsStep: React.FC<DescriptionsStepProps> = ({ 
  placeholders, 
  handleInputChange,
  autoFilledFields = []
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-gray-800 text-lg font-medium mb-4">{t('descriptions.title')}</h3>
        <p className="text-gray-600 mb-4">{t('descriptions.subtitle')}</p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              {t('descriptions.shortDescription')}*
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
              placeholder={t('descriptions.shortDescriptionPlaceholder')}
              rows={2}
              required
            />
            <p className="mt-1 text-sm text-gray-500">{t('descriptions.shortDescriptionHelp')}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              {t('descriptions.layoutDescription')}
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
              placeholder={t('descriptions.layoutDescriptionPlaceholder')}
              rows={4}
            />
            <p className="mt-1 text-sm text-gray-500">{t('descriptions.layoutDescriptionHelp')}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              {t('descriptions.detailedDescription')}
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
              placeholder={t('descriptions.detailedDescriptionPlaceholder')}
              rows={8}
              style={{ whiteSpace: 'pre-wrap' }}
            />
            <p className="mt-1 text-sm text-gray-500">{t('descriptions.detailedDescriptionHelp')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DescriptionsStep; 