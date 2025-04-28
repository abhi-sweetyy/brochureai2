"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PropertyPlaceholders } from '@/types/placeholders';

interface AmenitiesStepProps {
  placeholders: PropertyPlaceholders;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

// Define a type for the keys used in dynamic fields
type DynamicAmenityFieldKey = 'property_area' | 'number_floors' | 'floor' | 'number_units';

// Helper component for select options
const YesNoSelect: React.FC<{ name: keyof PropertyPlaceholders, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, label: string, className?: string }> = 
  ({ name, value, onChange, label, className }) => {
  const { t } = useTranslation();
  return (
    <select
      name={name}
      value={value || ''}
      onChange={onChange}
      className={`w-full rounded-md px-3 py-2 text-[#171717] bg-white border border-gray-300 focus:ring-2 focus:ring-[#5169FE] focus:border-transparent ${className || ''}`}
    >
      <option value="">{t('amenities.selectPlease')}</option>
      <option value="yes">{t('amenities.selectYes')}</option>
      <option value="no">{t('amenities.selectNo')}</option>
    </select>
  );
};

const AmenitiesStep: React.FC<AmenitiesStepProps> = ({ 
  placeholders, 
  handleInputChange
}) => {
  const { t } = useTranslation();
  
  const commonInputClass = "w-full rounded-md px-3 py-2 text-[#171717] bg-white border border-gray-300 focus:ring-2 focus:ring-[#5169FE] focus:border-transparent";
  const commonLabelClass = "block text-sm font-medium text-gray-700 mb-1";
  const sectionTitleClass = "text-gray-800 text-md font-semibold mb-3 pt-4 border-t border-gray-200 mt-4"; // Added separator

  // Determine which fields to show based on object_type
  const objectType = placeholders.object_type;
  let dynamicFields: { labelKey: string, name: DynamicAmenityFieldKey, placeholderKey: string }[] = [];

  if (objectType === 'family_house') {
    dynamicFields = [
      { labelKey: 'amenities.customLabel.house.p1', name: 'property_area', placeholderKey: 'amenities.enterPropertyArea' },
      { labelKey: 'amenities.customLabel.house.p2', name: 'number_floors', placeholderKey: 'amenities.enterNumberFloors' },
    ];
  } else if (objectType === 'apartment') {
    dynamicFields = [
      { labelKey: 'amenities.customLabel.apartment.p1', name: 'floor', placeholderKey: 'amenities.enterFloor' },
      { labelKey: 'amenities.customLabel.apartment.p2', name: 'number_units', placeholderKey: 'amenities.enterNumberUnits' },
    ];
  }

  return (
    <div className="space-y-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-[#171717] text-lg font-medium mb-2">{t('amenities.title')}</h3>
      <p className="text-gray-600 mb-4">{t('amenities.enterInfo')}</p>

      {/* Property Details Section */}
      <h4 className={sectionTitleClass}>{t('amenities.detailsTitle')}</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dynamic fields based on object_type */} 
        {dynamicFields.map(field => (
          <div key={field.name}>
            <label className={commonLabelClass}>{t(field.labelKey)}</label>
            <input 
              type="text" 
              name={field.name} 
              value={placeholders[field.name] || ''} 
              onChange={handleInputChange} 
              className={commonInputClass} 
              placeholder={t(field.placeholderKey)} 
            />
        </div>
        ))}

        {/* Remaining static fields */} 
        <div>
          <label className={commonLabelClass}>{t('amenities.livingArea')}</label>
          <input type="text" name="living_area" value={placeholders.living_area || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.enterLivingArea')} />
        </div>
        <div>
          <label className={commonLabelClass}>{t('amenities.renovations')}</label>
          <input type="text" name="renovations" value={placeholders.renovations || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.enterRenovations')} />
        </div>
        <div>
          <label className={commonLabelClass}>{t('amenities.numberRooms')}</label>
          <input type="text" name="number_rooms" value={placeholders.number_rooms || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.enterNumberRooms')} />
        </div>
        <div>
          <label className={commonLabelClass}>{t('amenities.numberBedrooms')}</label>
          <input type="text" name="number_bedrooms" value={placeholders.number_bedrooms || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.enterNumberBedrooms')} />
        </div>
        <div>
          <label className={commonLabelClass}>{t('amenities.numberBathrooms')}</label>
          <input type="text" name="number_bathrooms" value={placeholders.number_bathrooms || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.enterNumberBathrooms')} />
        </div>
        <div>
          <label className={commonLabelClass}>{t('amenities.numberKitchens')}</label>
          <input type="text" name="number_kitchens" value={placeholders.number_kitchens || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.enterNumberKitchens')} />
        </div>
      </div>

      {/* Features Section */}
      <h4 className={sectionTitleClass}>{t('amenities.featuresTitle')}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Changed to 2 columns for better spacing */}
         <div>
            <label className={commonLabelClass}>{t('amenities.flooring')}</label>
            <input type="text" name="flooring" value={placeholders.flooring || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.enterFlooring')} />
         </div>
         <div>
           <label className={commonLabelClass}>{t('amenities.heatingType')}</label>
           <input type="text" name="heating_type" value={placeholders.heating_type || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.enterHeatingType')} />
         </div>
         {/* Replaced YesNoSelect with text inputs */}
         <div>
           <label className={commonLabelClass}>{t('amenities.tv')}</label>
           <input type="text" name="tv" value={placeholders.tv || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.describeTV')} />
         </div>
         <div>
           <label className={commonLabelClass}>{t('amenities.balconyTerrace')}</label>
           <input type="text" name="balcony_terrace" value={placeholders.balcony_terrace || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.describeBalcony')} />
         </div>
         <div>
           <label className={commonLabelClass}>{t('amenities.elevator')}</label>
           <input type="text" name="elevator" value={placeholders.elevator || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.describeElevator')} />
         </div>
         <div>
           <label className={commonLabelClass}>{t('amenities.garage')}</label>
           <input type="text" name="garage" value={placeholders.garage || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.describeGarage')} />
         </div>
      </div>

      {/* Energy Information Section */}
      <h4 className={sectionTitleClass}>{t('amenities.energyTitle')}</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className={commonLabelClass}>{t('amenities.energyCertificate')}</label>
          <select
            name="energy_certificate"
            value={placeholders.energy_certificate || ''}
            onChange={handleInputChange}
            className={commonInputClass}
          >
            <option value="">{t('amenities.selectPlease')}</option>
            <option value="available_attached">{t('amenities.energyCertificate.availableAttached')}</option>
            <option value="in_progress">{t('amenities.energyCertificate.inProgress')}</option>
          </select>
        </div>
        <div>
          <label className={commonLabelClass}>{t('amenities.energyCertificateUntil')}</label>
          <input type="text" name="energy_certificate_until" value={placeholders.energy_certificate_until || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.enterEnergyCertificateUntil')} />
        </div>
        <div className="md:col-span-2">
          <label className={commonLabelClass}>{t('amenities.mainEnergySource')}</label>
          <input type="text" name="main_energy_source" value={placeholders.main_energy_source || ''} onChange={handleInputChange} className={commonInputClass} placeholder={t('amenities.enterMainEnergySource')} />
        </div>
      </div>

      {/* Description Section (Existing fields) */}
      <h4 className={sectionTitleClass}>{t('formSteps.basicInfo.description')}</h4> {/* Using existing translation key, maybe rename */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className={commonLabelClass}>{t('amenities.shortDescription')}</label>
          <textarea
            name="shortdescription"
            value={placeholders.shortdescription || ''}
            onChange={handleInputChange}
            rows={3}
            className={commonInputClass}
            placeholder={t('amenities.enterShortDescription')}
          />
        </div>
        <div>
          <label className={commonLabelClass}>{t('amenities.additionalFeatures')}</label>
          <textarea
            name="descriptionlarge"
            value={placeholders.descriptionlarge || ''}
            onChange={handleInputChange}
            rows={4}
            className={commonInputClass}
            placeholder={t('amenities.enterAdditionalFeatures')}
          />
        </div>
      </div>
    </div>
  );
};

export default AmenitiesStep;