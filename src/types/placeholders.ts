// Interface for the state holding image URLs in the frontend
export interface ImagePlaceholders {
  '{{logo}}': string;
  '{{agent}}': string;
  '{{image1}}': string;
  '{{image2}}': string;
  '{{image3}}': string;
  '{{image4}}': string;
  '{{image5}}': string;
  '{{image6}}': string;
  '{{image7}}': string;
  '{{image8}}': string;
  // '{{image9}}' was removed previously
}

// Interface for all property-related data, including text and city info
export interface PropertyPlaceholders {
  phone_number: string;
  email_address: string;
  website_name: string;
  title: string;
  address_street: string;
  address_house_nr: string;
  address_plz: string;
  address: string; // Combined address string
  object_type: 'apartment' | 'family_house' | '';
  offer_type: 'for_sale' | 'for_rent' | '';
  construction_year: string;
  maintenance_fees: string;
  shortdescription: string;
  price: string;
  date_available: string;
  name_brokerfirm: string;
  descriptionlarge: string;
  descriptionextralarge: string;
  address_brokerfirm: string;
  broker_name?: string;
  floor: string;
  number_units: string;
  property_area: string;
  number_floors: string;
  living_area: string;
  renovations: string;
  number_rooms: string;
  number_bedrooms: string;
  number_bathrooms: string;
  number_kitchens: string;
  tv: string;
  balcony_terrace: string;
  elevator: string;
  garage: string;
  flooring: string;
  heating_type: string;
  energy_certificate: 'available_attached' | 'in_progress' | '';
  energy_certificate_until: string;
  energy_demand: string;
  energy_efficiency: 'A' | 'G' | '';
  main_energy_source: string;

  // New Commission fields
  buyer_commission: string;
  seller_commission: string;

  // New derived placeholder
  priceplaceholder: string;

  // Custom dynamic placeholders
  customp1: string;
  customp1value: string;
  customp2: string;
  customp2value: string;

  // City Placeholders
  cityname: string;
  city_text1: string;
  cityimg1: string; // URL for city image 1
  cityimg2: string; // URL for city image 2
  cityimg3: string; // URL for city image 3

  // Other relevant data stored within project_details
  selected_pages?: Record<string, boolean>;
}

export const defaultPlaceholders: PropertyPlaceholders = {
  phone_number: "",
  email_address: "",
  website_name: "",
  title: "",
  address_street: "",
  address_house_nr: "",
  address_plz: "",
  address: "",
  object_type: "",
  offer_type: "",
  construction_year: "",
  maintenance_fees: "",
  shortdescription: "",
  price: "",
  date_available: "",
  name_brokerfirm: "",
  descriptionlarge: "",
  descriptionextralarge: "",
  address_brokerfirm: "",
  broker_name: "",
  floor: "",
  number_units: "",
  property_area: "",
  number_floors: "",
  living_area: "",
  renovations: "",
  number_rooms: "",
  number_bedrooms: "",
  number_bathrooms: "",
  number_kitchens: "",
  tv: "",
  balcony_terrace: "",
  elevator: "",
  garage: "",
  flooring: "",
  heating_type: "",
  energy_certificate: "",
  energy_certificate_until: "",
  energy_demand: "",
  energy_efficiency: "",
  main_energy_source: "",
  buyer_commission: "",
  seller_commission: "",
  priceplaceholder: "",
  customp1: "",
  customp1value: "",
  customp2: "",
  customp2value: "",
  cityname: "",
  city_text1: "",
  cityimg1: "",
  cityimg2: "",
  cityimg3: "",
  selected_pages: {},
};

// Also define default values for the ImagePlaceholders state if needed elsewhere,
// though it's usually initialized directly in the component state.
export const defaultImagePlaceholders: ImagePlaceholders = {
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
};
