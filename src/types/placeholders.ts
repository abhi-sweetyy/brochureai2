export interface PropertyPlaceholders {
  phone_number: string;
  email_address: string;
  website_name: string;
  title: string;
  address: string;
  shortdescription: string;
  price: string;
  date_available: string;
  name_brokerfirm: string;
  descriptionlarge: string;
  descriptionextralarge: string;
  address_brokerfirm: string;
}

export const defaultPlaceholders: PropertyPlaceholders = {
  phone_number: '',
  email_address: '',
  website_name: '',
  title: '',
  address: '',
  shortdescription: '',
  price: '',
  date_available: '',
  name_brokerfirm: 'Ihre Immobilienmakler GmbH',
  descriptionlarge: '',
  descriptionextralarge: '',
  address_brokerfirm: 'Musterstraße 123, 12345 Berlin'
}; 