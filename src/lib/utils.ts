// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge" // <-- CORRECTED: twMerge instead of twxMerge

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs)) // <-- CORRECTED USAGE
}


/**
 * Converts a JSON array of objects into a downloadable CSV file.
 * @param data The array of objects (Incident Reports) to export.
 * @param fileName The desired name for the downloaded file.
 */
export function exportToCsv(data: any[], fileName: string): void {
    if (data.length === 0) {
        console.warn("No data to export.");
        return;
    }

    // 1. Get the headers (keys of the first object)
    // We only include relevant fields for email marketing/triage
    const headers = ['name', 'email', 'brandName', 'category', 'issueDescription', 'submittedAt'];
    
    // 2. Format the CSV rows
    const csvRows = [];
    csvRows.push(headers.join(',')); // Add header row

    for (const row of data) {
        const values = headers.map(header => {
            // Get the value, handle potential null/undefined
            let value = row[header] !== undefined && row[header] !== null ? row[header] : '';
            
            // Basic sanitization: escape double quotes and wrap in quotes
            if (typeof value === 'string') {
                value = value.replace(/"/g, '""'); 
            }
            // If the value contains commas, quotes, or newlines, wrap it in double quotes
            return `"${value}"`;
        });
        csvRows.push(values.join(','));
    }

    // 3. Create the Blob and download link
    const csvString = csvRows.join('\n');
    // Create a Blob with the CSV data
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    // Append to the document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}