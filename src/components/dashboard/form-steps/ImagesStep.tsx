"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ImageUploader from "@/components/ImageUploader";
import GoogleMapsLocationComponent from "@/components/GoogleMapsLocationComponent";

interface ImagePlaceholders {
  "{{logo}}": string;
  "{{agent}}": string;
  "{{image1}}": string;
  "{{image2}}": string;
  "{{image3}}": string;
  "{{image4}}": string;
  "{{image5}}": string;
  "{{image6}}": string;
  "{{image7}}": string;
  "{{image8}}": string;
}

interface ImagesStepProps {
  uploadedImages: ImagePlaceholders;
  logoUrl?: string;
  setUploadedImages: (images: ImagePlaceholders) => void;
  setLogoUrl?: (url: string) => void;
  selectedPages?: Record<string, boolean>;
  propertyAddress?: string; // Neue Property für die Immobilienadresse
}

export function ImagesStep({
  uploadedImages,
  logoUrl,
  setUploadedImages,
  setLogoUrl,
  selectedPages = {},
  propertyAddress = "",
}: ImagesStepProps) {
  const { t } = useTranslation();
  const [logo, setLogo] = useState<string>(logoUrl || "");
  const [agent, setAgent] = useState<string>(uploadedImages["{{agent}}"] || "");
  const [image1, setImage1] = useState<string>(
    uploadedImages["{{image1}}"] || "",
  );
  const [image2, setImage2] = useState<string>(
    uploadedImages["{{image2}}"] || "",
  );
  const [image3, setImage3] = useState<string>(
    uploadedImages["{{image3}}"] || "",
  );
  const [image4, setImage4] = useState<string>(
    uploadedImages["{{image4}}"] || "",
  );
  const [image5, setImage5] = useState<string>(
    uploadedImages["{{image5}}"] || "",
  );
  const [image6, setImage6] = useState<string>(
    uploadedImages["{{image6}}"] || "",
  );
  const [image7, setImage7] = useState<string>(
    uploadedImages["{{image7}}"] || "",
  );
  const [image8, setImage8] = useState<string>(
    uploadedImages["{{image8}}"] || "",
  );

  // Google Maps API Key (aus Umgebungsvariable)
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  // Handle clicks on the image uploader to prevent form submission
  const handleImageUploaderClick = (e: React.MouseEvent) => {
    // Only stop propagation to prevent form submission
    // but don't prevent default actions like opening file pickers
    e.stopPropagation();
  };

  useEffect(() => {
    setLogo(logoUrl || "");
    setAgent(uploadedImages["{{agent}}"] || "");
    setImage1(uploadedImages["{{image1}}"] || "");
    setImage2(uploadedImages["{{image2}}"] || "");
    setImage3(uploadedImages["{{image3}}"] || "");
    setImage4(uploadedImages["{{image4}}"] || "");
    setImage5(uploadedImages["{{image5}}"] || "");
    setImage6(uploadedImages["{{image6}}"] || "");
    setImage7(uploadedImages["{{image7}}"] || "");
    setImage8(uploadedImages["{{image8}}"] || "");
  }, [uploadedImages, logoUrl]);

  const handleImageUpdate = (
    placeholder: keyof ImagePlaceholders,
    urls: string[],
  ) => {
    if (urls.length === 0) {
      // If urls is empty, it means the image was removed
      console.log(`Clearing image for placeholder: ${placeholder}`);

      // Update local state
      switch (placeholder) {
        case "{{logo}}":
          setLogo("");
          setLogoUrl?.("");
          break;
        case "{{agent}}":
          setAgent("");
          break;
        case "{{image1}}":
          setImage1("");
          break;
        case "{{image2}}":
          setImage2("");
          break;
        case "{{image3}}":
          setImage3("");
          break;
        case "{{image4}}":
          setImage4("");
          break;
        case "{{image5}}":
          setImage5("");
          break;
        case "{{image6}}":
          setImage6("");
          break;
        case "{{image7}}":
          setImage7("");
          break;
        case "{{image8}}":
          setImage8("");
          break;
      }

      // Update parent state by removing the image URL
      const newImages = { ...uploadedImages };
      newImages[placeholder] = "";
      setUploadedImages(newImages);

      return;
    }

    const url = urls[0];
    console.log(
      `Updating image for placeholder: ${placeholder} with URL: ${url}`,
    );

    // Update local state
    switch (placeholder) {
      case "{{logo}}":
        setLogo(url);
        setLogoUrl?.(url);
        break;
      case "{{agent}}":
        setAgent(url);
        break;
      case "{{image1}}":
        setImage1(url);
        break;
      case "{{image2}}":
        setImage2(url);
        break;
      case "{{image3}}":
        setImage3(url);
        break;
      case "{{image4}}":
        setImage4(url);
        break;
      case "{{image5}}":
        setImage5(url);
        break;
      case "{{image6}}":
        setImage6(url);
        break;
      case "{{image7}}":
        setImage7(url);
        break;
      case "{{image8}}":
        setImage8(url);
        break;
    }

    // Update parent state
    setUploadedImages({
      ...uploadedImages,
      [placeholder]: url,
    });
  };

  // Handler für die Google Maps Kartenbildgenerierung
  const handleMapImageGenerated = (imageUrl: string) => {
    // Das generierte Kartenbild für Building Layout verwenden (image2)
    handleImageUpdate("{{image2}}", [imageUrl]);
  };

  const getImageSections = () => {
    const sections: JSX.Element[] = [];

    // Company Logo - Always shown
    sections.push(
      <div key="logo" className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t("imagesStep.companyLogo")}
        </h3>
        <p className="text-gray-700 mb-4">{t("imagesStep.companyLogoDesc")}</p>
        <ImageUploader
          existingImages={logoUrl ? [logoUrl] : []}
          onImagesUploaded={(urls) => {
            handleImageUpdate("{{logo}}", urls);
          }}
          limit={1}
          onClick={handleImageUploaderClick}
        />
      </div>,
    );

    // Agent Photo - Always shown
    sections.push(
      <div key="agent" className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t("imagesStep.agentPhoto")}
        </h3>
        <p className="text-gray-700 mb-4">{t("imagesStep.agentPhotoDesc")}</p>
        <ImageUploader
          existingImages={
            uploadedImages["{{agent}}"] ? [uploadedImages["{{agent}}"]] : []
          }
          onImagesUploaded={(urls) => {
            handleImageUpdate("{{agent}}", urls);
          }}
          limit={1}
          onClick={handleImageUploaderClick}
        />
      </div>,
    );

    // Project Overview Images
    if (selectedPages.projectOverview) {
      sections.push(
        <div key="overview" className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("imagesStep.projectOverview")}
          </h3>
          <p className="text-gray-700 mb-4">
            {t("imagesStep.projectOverviewDesc")}
          </p>
          <ImageUploader
            existingImages={image1 ? [image1] : []}
            onImagesUploaded={(urls: string[]) =>
              handleImageUpdate("{{image1}}", urls)
            }
            limit={1}
            onClick={handleImageUploaderClick}
          />
        </div>,
      );
    }

    // Building Layout Plan mit Google Maps
    if (selectedPages.buildingLayout) {
      sections.push(
        <div key="layout" className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("imagesStep.buildingLayout")}
          </h3>
          <p className="text-gray-700 mb-4">
            {t(
              "imagesStep.buildingLayoutMapDesc",
              "Eine interaktive Karte, die den Standort der Immobilie zeigt.",
            )}
          </p>

          {/* Google Maps-Komponente für Building Layout */}
          <div className="space-y-4">
            {/* Google Maps Komponente wird immer angezeigt */}
            <GoogleMapsLocationComponent
              address={propertyAddress}
              onMapImageGenerated={handleMapImageGenerated}
              existingImageUrl={image2}
              apiKey={googleMapsApiKey}
            />

            {/* Trennlinie zwischen Google Maps und manuellem Upload */}
            {propertyAddress && (
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-sm text-gray-500">
                    {t("imagesStep.or", "ODER")}
                  </span>
                </div>
              </div>
            )}

            {/* Manueller Upload nur anzeigen, wenn keine Karte vorhanden ist oder explizit gewünscht */}
            <div className={image2 ? "hidden" : "block"}>
              <p className="text-sm text-gray-500 mb-2">
                {t(
                  "imagesStep.orUploadManually",
                  "Laden Sie manuell ein Bild hoch:",
                )}
              </p>

              <ImageUploader
                existingImages={[]} // Kein existierendes Bild hier anzeigen, da es schon in der Karte angezeigt wird
                onImagesUploaded={(urls: string[]) =>
                  handleImageUpdate("{{image2}}", urls)
                }
                limit={1}
                onClick={handleImageUploaderClick}
              />
            </div>
          </div>
        </div>,
      );
    }

    // Exterior Photos
    if (selectedPages.exteriorPhotos) {
      sections.push(
        <div key="exterior" className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("imagesStep.exteriorPhotos")}
          </h3>
          <p className="text-gray-700 mb-4">
            {t("imagesStep.exteriorPhotosDesc")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-700 mb-2">
                {t("imagesStep.exteriorPhoto1")}
              </p>
              <ImageUploader
                existingImages={image3 ? [image3] : []}
                onImagesUploaded={(urls: string[]) =>
                  handleImageUpdate("{{image3}}", urls)
                }
                limit={1}
                onClick={handleImageUploaderClick}
              />
            </div>
            <div>
              <p className="text-sm text-gray-700 mb-2">
                {t("imagesStep.exteriorPhoto2")}
              </p>
              <ImageUploader
                existingImages={image4 ? [image4] : []}
                onImagesUploaded={(urls: string[]) =>
                  handleImageUpdate("{{image4}}", urls)
                }
                limit={1}
                onClick={handleImageUploaderClick}
              />
            </div>
          </div>
        </div>,
      );
    }

    // Interior Photos
    if (selectedPages.interiorPhotos) {
      sections.push(
        <div key="interior" className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("imagesStep.interiorPhotos")}
          </h3>
          <p className="text-gray-700 mb-4">
            {t("imagesStep.interiorPhotosDesc")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-700 mb-2">
                {t("imagesStep.interiorPhoto1")}
              </p>
              <ImageUploader
                existingImages={image5 ? [image5] : []}
                onImagesUploaded={(urls: string[]) =>
                  handleImageUpdate("{{image5}}", urls)
                }
                limit={1}
                onClick={handleImageUploaderClick}
              />
            </div>
            <div>
              <p className="text-sm text-gray-700 mb-2">
                {t("imagesStep.interiorPhoto2")}
              </p>
              <ImageUploader
                existingImages={image6 ? [image6] : []}
                onImagesUploaded={(urls: string[]) =>
                  handleImageUpdate("{{image6}}", urls)
                }
                limit={1}
                onClick={handleImageUploaderClick}
              />
            </div>
          </div>
        </div>,
      );
    }

    // Floor Plan
    if (selectedPages.floorPlan) {
      sections.push(
        <div key="floorplan" className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("imagesStep.floorPlan")}
          </h3>
          <p className="text-gray-700 mb-4">{t("imagesStep.floorPlanDesc")}</p>
          <ImageUploader
            existingImages={image7 ? [image7] : []}
            onImagesUploaded={(urls: string[]) =>
              handleImageUpdate("{{image7}}", urls)
            }
            limit={1}
            onClick={handleImageUploaderClick}
          />
        </div>,
      );
    }

    // Energy Certificate
    if (selectedPages.energyCertificate) {
      sections.push(
        <div key="energy" className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("imagesStep.energyCertificate")}
          </h3>
          <p className="text-gray-700 mb-4">
            {t("imagesStep.energyCertificateDesc")}
          </p>
          <div>
            <p className="text-sm text-gray-700 mb-2">
              {t("imagesStep.energyPage1")}
            </p>
            <ImageUploader
              existingImages={image8 ? [image8] : []}
              onImagesUploaded={(urls: string[]) =>
                handleImageUpdate("{{image8}}", urls)
              }
              limit={1}
              onClick={handleImageUploaderClick}
            />
          </div>
        </div>,
      );
    }

    return sections;
  };

  return (
    <div className="space-y-8">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
        <p className="text-blue-700">{t("imagesStep.uploadInfo")}</p>
      </div>
      {getImageSections()}
    </div>
  );
}

export default ImagesStep;
