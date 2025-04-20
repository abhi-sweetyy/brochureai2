// Create a new file for AI processing utilities - AI ONLY, no static matching

// Define the EXACT placeholders from your list - no more, no less
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

// Property data interface that maps to your JSON structure
export interface PropertyData {
  projectname: string;
  address: string;
  category: string;
  price: string;
  space: string;
  yearofconstruction: string;
  condition: string;
  qualityofequipment: string;
  balcony: string;
  summary: string;
  layoutdescription: string;
  phone: string;
  email: string;
  website: string;
  amenities: string[];
  powerbackup: string;
  security: string;
  gym: string;
  playarea: string;
  maintainence: string;
}

// Function to process property descriptions with AI ONLY - fully dynamic approach
export const processPropertyDescription = async (description: string): Promise<{
  placeholders: Partial<PropertyPlaceholders>
}> => {
  try {
    console.log("Processing text with AI:", description.substring(0, 100) + "...");
    
    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("API key not configured");
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Real Estate Extractor'
      },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-72b-instruct:free',
        messages: [
          {
            role: 'system',
            content: `Extract these 12 specific placeholders from the property text:

1. phone_number - Contact phone number for inquiries
2. email_address - Email address for contact
3. website_name - Website of the broker/agency
4. title - Professional property title (e.g., "Modern Villa with Lake View")
5. address - Complete property address
6. shortdescription - A SINGLE SENTENCE mentioning property type, whether it's for rent or sale, and location (e.g., "Luxurious apartment for sale in Berlin Mitte with balcony")
7. price - Property price with currency symbol
8. date_available - When the property is available
9. name_brokerfirm - Real estate agency name
10. descriptionlarge - A paragraph about the site plan and position of the property
11. descriptionextralarge - A detailed multi-paragraph description of the property
12. address_brokerfirm - Address of the broker firm

VERY IMPORTANT: Respond with ONLY the JSON object containing these 12 keys. Do NOT include any introductory text, explanations, markdown formatting (like \`\`\`json), or anything else before or after the JSON object itself. If information for a key is not found, use an empty string "" as the value. Ensure the JSON is valid.`
          },
          {
            role: 'user',
            content: description
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API request failed with status ${response.status}:`, errorBody);
      return { placeholders: {} };
    }

    const data = await response.json();
    
    if (!data?.choices?.[0]?.message?.content) {
      console.error("Invalid API response structure:", JSON.stringify(data));
      return { placeholders: {} };
    }
    
    let parsedContent: any;
    let contentToParse: string | null = null;
    
    try {
      const rawContent = data.choices[0].message.content;
      console.log("Raw AI response content:", rawContent.substring(0, 250) + "...");
      
      if (typeof rawContent !== 'string') {
        console.error("AI response content is not a string:", typeof rawContent);
        return { placeholders: {} };
      }
      
      let cleanedContent = rawContent.trim();
      
      // Improved JSON Extraction
      // 1. Try finding JSON within markdown fences (```json ... ```)
      const markdownMatch = cleanedContent.match(/```json\\\\n?(\{[\\s\\S]*?\})\\\\n?```/);
      if (markdownMatch && markdownMatch[1]) {
        console.log("Found JSON within markdown code fence.");
        contentToParse = markdownMatch[1];
      } else {
        // 2. Fallback: Find first '{' and last '}'
        const jsonStart = cleanedContent.indexOf('{');
        const jsonEnd = cleanedContent.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          console.log("Attempting to extract JSON using first '{' and last '}'.");
          contentToParse = cleanedContent.substring(jsonStart, jsonEnd + 1);
        } else {
          // 3. If no obvious JSON block, maybe the whole string IS the JSON (as requested)
          console.log("No JSON fences or clear braces found, attempting to parse the trimmed content directly.");
          contentToParse = cleanedContent;
        }
      }
      
      if (!contentToParse) {
        console.error("Could not extract a potential JSON string from the AI response.");
        return { placeholders: {} };
      }

      console.log("Attempting to parse JSON string:", contentToParse);
      parsedContent = JSON.parse(contentToParse);
      console.log("Successfully parsed AI response.");
      
    } catch (parseError: any) {
      console.error("Failed to parse AI response JSON:", parseError.message);
      console.error("String that failed parsing:", contentToParse);
      return { placeholders: {} };
    }
    
    // Format and create dynamic placeholders object
    const placeholders: Partial<PropertyPlaceholders> = {};
    Object.keys(parsedContent).forEach(key => {
      if (key in parsedContent && parsedContent[key] !== null && parsedContent[key] !== undefined) {
        placeholders[key as keyof PropertyPlaceholders] = String(parsedContent[key]);
      }
    });
    
    console.log("Extracted the following fields dynamically:", Object.keys(placeholders).join(", "));
    return { placeholders };
  } catch (error) {
    console.error('Error in processPropertyDescription (Outer try/catch):', error);
    return { placeholders: {} };
  }
}; 
