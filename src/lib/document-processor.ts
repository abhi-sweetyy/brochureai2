import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { templates } from '@/components/templates';
import mammoth from 'mammoth';

interface ProcessDocumentProps {
  templatePath: string;
  projectData: {
    title: string;
    website: string;
    email: string;
    address: string;
  };
}

export const processDocument = async ({ templatePath, projectData }: ProcessDocumentProps) => {
  try {
    // Find the template configuration
    const template = templates.find(t => t.documentPath === templatePath);
    if (!template) throw new Error('Template not found');

    // Load DOCX template
    console.log('Loading DOCX template:', templatePath);
    const templateResponse = await fetch(templatePath);
    if (!templateResponse.ok) {
      throw new Error(`Failed to load DOCX template: ${templateResponse.statusText}`);
    }
    
    const docxArrayBuffer = await templateResponse.arrayBuffer();

    // Generate AI summary
    let summary = '';
    try {
      const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'OR-ORGANIZATION': window.location.origin
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-pro-exp-02-05:free',
          messages: [{
            role: 'system',
            content: 'You are a professional real estate copywriter. Create a compelling property listing summary.'
          }, {
            role: 'user',
            content: `Create a brief, engaging 2-3 sentence summary for this property: ${projectData.title} located at ${projectData.address}. Focus on its unique features and appeal.`
          }]
        })
      });

      if (!aiResponse.ok) throw new Error(`AI API error: ${aiResponse.statusText}`);
      const data = await aiResponse.json();
      summary = data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating AI summary:', error);
      summary = `Discover luxury living at this exceptional property. Located at ${projectData.address}, this stunning space offers the perfect blend of comfort and sophistication.`;
    }

    // Get HTML content from DOCX
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: docxArrayBuffer });
    
    // Replace placeholders in HTML
    let processedHtml = html;
    const replacements = {
      [template.placeholders.projectTitle.selector]: projectData.title,
      [template.placeholders.summary.selector]: summary,
      [template.placeholders.website.selector]: projectData.website,
      [template.placeholders.email.selector]: projectData.email,
      [template.placeholders.address.selector]: projectData.address
    };
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      processedHtml = processedHtml.replace(new RegExp(escapeRegExp(placeholder), 'g'), value || '');
    });
    
    // Convert HTML to PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    // Extract text content from HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processedHtml;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Format text for PDF
    const lines = textContent.split('\n').filter(line => line.trim());
    
    // Add content to PDF
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let yOffset = page.getHeight() - 50;
    
    for (const line of lines) {
      // Check if this is a title or heading
      const isTitle = line.includes(projectData.title);
      const isHeading = line.length < 50 && line.trim().endsWith(':');
      
      const fontSize = isTitle ? 24 : isHeading ? 16 : 12;
      const font = isTitle || isHeading ? helveticaBold : helveticaFont;
      
      // Clean the text to remove problematic characters
      const cleanedLine = line.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
      
      // Word wrap for long lines
      const words = cleanedLine.split(' ');
      let currentLine = '';
      const maxWidth = page.getWidth() - 100;
      
      for (const word of words) {
        // Skip empty words
        if (!word.trim()) continue;
        
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        
        if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
          try {
            page.drawText(currentLine, {
              x: 50,
              y: yOffset,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0)
            });
          } catch (error) {
            console.warn('Could not draw text:', currentLine, error);
          }
          yOffset -= fontSize + 8;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        try {
          page.drawText(currentLine, {
            x: 50,
            y: yOffset,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0)
          });
        } catch (error) {
          console.warn('Could not draw text:', currentLine, error);
        }
        yOffset -= fontSize + (isTitle ? 20 : isHeading ? 16 : 8);
      }
    }
    
    const pdfBytes = await pdfDoc.save();
    
    console.log("PDF generation complete. PDF size:", pdfBytes.length, "bytes");
    if (pdfBytes.length < 100) {
      console.warn("Warning: PDF is suspiciously small, might be invalid");
    }
    
    return {
      pdfBytes,
      summary,
      replacements
    };
  } catch (error) {
    console.error('Document processing failed:', error);
    throw error;
  }
};

// Helper function to escape special characters in regex
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 