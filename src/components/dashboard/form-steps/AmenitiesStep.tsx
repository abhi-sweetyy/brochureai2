"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PropertyPlaceholders } from '@/types/placeholders';

interface AmenitiesStepProps {
  placeholders: PropertyPlaceholders;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const AmenitiesStep: React.FC<AmenitiesStepProps> = ({ 
  placeholders, 
  handleInputChange
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[#171717] text-lg font-medium mb-4">{t('amenities.title')}</h3>
        <p className="text-gray-600 mb-4">{t('amenities.enterInfo')}:</p>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('amenities.shortDescription')}</label>
            <textarea
              name="shortdescription"
              value={placeholders.shortdescription || ''}
              onChange={handleInputChange}
              rows={3}
              className="w-full rounded-md px-3 py-2 text-[#171717] bg-white border border-gray-300 focus:ring-2 focus:ring-[#5169FE] focus:border-transparent"
              placeholder={t('amenities.enterShortDescription')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('amenities.additionalFeatures')}</label>
            <textarea
              name="descriptionlarge"
              value={placeholders.descriptionlarge || ''}
              onChange={handleInputChange}
              rows={4}
              className="w-full rounded-md px-3 py-2 text-[#171717] bg-white border border-gray-300 focus:ring-2 focus:ring-[#5169FE] focus:border-transparent"
              placeholder={t('amenities.enterAdditionalFeatures')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmenitiesStep;