/**
 * Export utilities for saving projects in different formats
 */

import type { Project } from '../services/storage';

/**
 * Export formats supported
 */
export type ExportFormat = 'txt' | 'md' | 'html' | 'docx';

/**
 * Triggers a download of content as a file
 * @param content - File content
 * @param filename - Name of the file
 * @param mimeType - MIME type of the file
 */
function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sanitizes a filename by removing invalid characters
 * @param filename - Original filename
 * @returns Sanitized filename
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .substring(0, 200); // Limit length
}

/**
 * Exports project as plain text (.txt)
 * @param project - Project to export
 */
export function exportAsText(project: Project): void {
  const filename = sanitizeFilename(project.title || 'Untitled') + '.txt';
  const content = project.content;
  downloadFile(content, filename, 'text/plain');
}

/**
 * Exports project as Markdown (.md)
 * @param project - Project to export
 */
export function exportAsMarkdown(project: Project): void {
  const filename = sanitizeFilename(project.title || 'Untitled') + '.md';
  let content = `# ${project.title || 'Untitled'}\n\n`;
  
  if (project.description) {
    content += `> ${project.description}\n\n`;
  }
  
  content += project.content;
  
  downloadFile(content, filename, 'text/markdown');
}

/**
 * Exports project as HTML (.html)
 * @param project - Project to export
 */
export function exportAsHTML(project: Project): void {
  const filename = sanitizeFilename(project.title || 'Untitled') + '.html';
  
  // Convert line breaks to paragraphs
  const paragraphs = project.content
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `    <p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title || 'Untitled'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 0.5em;
      color: #1a1a1a;
    }
    .description {
      font-style: italic;
      color: #666;
      margin-bottom: 2em;
      padding-left: 1em;
      border-left: 3px solid #ddd;
    }
    p {
      margin-bottom: 1em;
    }
    @media print {
      body {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <h1>${project.title || 'Untitled'}</h1>
  ${project.description ? `<div class="description">${project.description}</div>` : ''}
  <div class="content">
${paragraphs}
  </div>
</body>
</html>`;
  
  downloadFile(html, filename, 'text/html');
}

/**
 * Exports project as Word document (.docx)
 * Creates an RTF file that can be opened in Word, Google Docs, etc.
 * @param project - Project to export
 */
export function exportAsWord(project: Project): void {
  const filename = sanitizeFilename(project.title || 'Untitled') + '.doc';
  
  // Create RTF content (compatible with Word and Google Docs)
  // RTF is simpler than full DOCX but opens in all word processors
  let rtf = '{\\rtf1\\ansi\\deff0\n';
  
  // Font table
  rtf += '{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}}\n';
  
  // Title
  rtf += '{\\fs32\\b ' + escapeRTF(project.title || 'Untitled') + '\\b0\\fs24\\par}\n';
  rtf += '\\par\n';
  
  // Description if exists
  if (project.description) {
    rtf += '{\\i ' + escapeRTF(project.description) + '\\i0\\par}\n';
    rtf += '\\par\n';
  }
  
  // Content - split by paragraphs
  const paragraphs = project.content.split('\n\n').filter(p => p.trim());
  paragraphs.forEach(paragraph => {
    // Replace single line breaks with spaces, keep paragraph breaks
    const text = paragraph.replace(/\n/g, ' ').trim();
    rtf += escapeRTF(text) + '\\par\n';
    rtf += '\\par\n';
  });
  
  rtf += '}';
  
  downloadFile(rtf, filename, 'application/rtf');
}

/**
 * Escapes special characters for RTF format
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeRTF(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\n/g, '\\par\n');
}

/**
 * Auto-formats text content with basic formatting rules
 * - Fixes multiple spaces
 * - Fixes line breaks
 * - Capitalizes sentences
 * - Adds proper spacing after punctuation
 * @param text - Text to format
 * @returns Formatted text
 */
export function autoFormatText(text: string): string {
  let formatted = text;
  
  // Fix multiple spaces (keep intentional double spaces after periods)
  formatted = formatted.replace(/ {3,}/g, ' ');
  
  // Fix multiple line breaks (max 2 consecutive)
  formatted = formatted.replace(/\n{4,}/g, '\n\n\n');
  
  // Add space after punctuation if missing (but not for decimals or abbreviations)
  formatted = formatted.replace(/([.!?])([A-Z])/g, '$1 $2');
  
  // Remove space before punctuation
  formatted = formatted.replace(/ +([.!?,;:])/g, '$1');
  
  // Capitalize first letter of sentences
  formatted = formatted.replace(/(^|[.!?]\s+)([a-z])/g, (_match, p1, p2) => p1 + p2.toUpperCase());
  
  // Fix common quote issues
  formatted = formatted.replace(/\s+"/g, ' "');
  formatted = formatted.replace(/"\s+/g, '" ');
  
  // Trim trailing whitespace from lines
  formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n');
  
  // Trim leading/trailing whitespace from entire text
  formatted = formatted.trim();
  
  return formatted;
}

/**
 * Exports project in the specified format
 * @param project - Project to export
 * @param format - Export format
 */
export function exportProject(project: Project, format: ExportFormat): void {
  switch (format) {
    case 'txt':
      exportAsText(project);
      break;
    case 'md':
      exportAsMarkdown(project);
      break;
    case 'html':
      exportAsHTML(project);
      break;
    case 'docx':
      exportAsWord(project);
      break;
    default:
      console.error('[Export] Unknown format:', format);
  }
}
