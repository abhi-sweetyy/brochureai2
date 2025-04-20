import {
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  Typography,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from '@/app/i18n';
import { useLanguage } from '@/app/contexts/LanguageContext';

export interface PageOption {
  id: string;
  label: string;
  requiredImages: number;
  placeholderKeys?: string[];
}

export const availablePages: PageOption[] = [
  {
    id: "projectOverview",
    label: "Project Overview",
    requiredImages: 1,
    placeholderKeys: ["{{image1}}"],
  },
  {
    id: "buildingLayout",
    label: "Building Layout Plan",
    requiredImages: 1,
    placeholderKeys: ["{{image2}}"],
  },
  {
    id: "description",
    label: "Description",
    requiredImages: 0,
  },
  {
    id: "exteriorPhotos",
    label: "Exterior Photos",
    requiredImages: 2,
    placeholderKeys: ["{{image3}}", "{{image4}}"],
  },
  {
    id: "interiorPhotos",
    label: "Interior Photos",
    requiredImages: 2,
    placeholderKeys: ["{{image5}}", "{{image6}}"],
  },
  {
    id: "floorPlan",
    label: "Floor Plan",
    requiredImages: 1,
    placeholderKeys: ["{{image7}}"],
  },
  {
    id: "energyCertificate",
    label: "Excerpt from energy certificate",
    requiredImages: 2,
    placeholderKeys: ["{{image8}}", "{{image9}}"],
  },
  {
    id: "termsConditions",
    label: "Terms & Conditions",
    requiredImages: 0,
  },
];

interface PagesSelectionStepProps {
  selectedPages: Record<string, boolean>;
  onPagesChange: (pages: Record<string, boolean>) => void;
}

export const PagesSelectionStep: React.FC<PagesSelectionStepProps> = ({
  selectedPages,
  onPagesChange,
}) => {
  const { t, i18n: translationInstance } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [, forceUpdate] = useState({});
  
  // Force component to re-render when language changes
  useEffect(() => {
    console.log("Language in PagesSelectionStep changed to:", currentLanguage);
    console.log("PagesSelectionStep i18n instance language:", translationInstance.language);
    console.log("Global i18n instance language:", i18n.language);
    
    // Test translation of a key
    const selectionTitle = t('pagesSelection.title');
    console.log("Translation test - pagesSelection.title:", selectionTitle);
    if (selectionTitle === 'pagesSelection.title') {
      console.warn("Translation not working correctly in PagesSelectionStep - showing key instead of value");
    }
    
    // Force component re-render to ensure translations are updated
    forceUpdate({});
  }, [currentLanguage, translationInstance.language, t]);
  
  const handlePageChange = (pageId: string, checked: boolean) => {
    const newSelectedPages = {
      ...selectedPages,
      [pageId]: checked,
    };
    onPagesChange(newSelectedPages);
  };

  const getTranslatedLabel = (pageId: string, defaultLabel: string): string => {
    const translationKey = `pages.${pageId}`;
    const translation = t(translationKey);
    
    // Log translation status for debugging
    if (translation === translationKey) {
      console.log(`Translation not found for: ${translationKey}, using default: ${defaultLabel}`);
    }
    
    // If the translation key doesn't exist and returns the key itself, use the default label
    return translation === translationKey ? defaultLabel : translation;
  };

  return (
    <Paper
      sx={{ p: 3, bgcolor: "white", borderColor: "grey.200", boxShadow: 1 }}
    >
      <Typography variant="h6" gutterBottom sx={{ color: "#171717" }}>
        {t('pagesSelection.title')}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        {t('pagesSelection.description')}
      </Typography>

      <FormGroup>
        {availablePages.map((page) => (
          <FormControlLabel
            key={page.id}
            control={
              <Checkbox
                checked={selectedPages[page.id] ?? true}
                onChange={(e) => handlePageChange(page.id, e.target.checked)}
                sx={{
                  color: "grey.500",
                  "&.Mui-checked": {
                    color: "#5169FE",
                  },
                }}
              />
            }
            label={
              <Typography sx={{ color: "#171717" }}>
                {`${getTranslatedLabel(page.id, page.label)} ${page.requiredImages > 0 ? `(${page.requiredImages} ${page.requiredImages > 1 ? t('pagesSelection.images') : t('pagesSelection.image')})` : ""}`}
              </Typography>
            }
          />
        ))}
      </FormGroup>
    </Paper>
  );
};

export default PagesSelectionStep;
