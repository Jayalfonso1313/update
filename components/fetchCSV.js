import Papa from 'papaparse';

export async function fetchCSV(url) {
  try {
    // console.log("Fetching CSV from URL:", url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }

    const text = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: false, // No header row
        complete: (result) => {
          // console.log("Raw Parsed Data (First 10 Rows):", result.data.slice(3100, 3110)); // Log first 10 rows

          // Extract time and amplitude
          const data = result.data.slice(1); // Skip the header if any
          const time = [];
          const amplitude = [];

          data.forEach((row, index) => {
            const timeValue = parseFloat(row[0]);
            const amplitudeValue = parseFloat(row[1]);

            if (!isNaN(timeValue) && !isNaN(amplitudeValue)) {
              time.push(timeValue);
              amplitude.push(amplitudeValue);
            } else {
              // console.warn(`Invalid data at row ${index + 2}:`, row);
            }
          });

          if (time.length === 0 || amplitude.length === 0) {
            reject(new Error("Parsed data is empty or invalid."));
          } else {
            // console.log("Processed Time (First 10):", time.slice(0, 10)); // Log first 10 time values
            // console.log("Processed Amplitude (First 10):", amplitude.slice(0, 10)); // Log first 10 amplitude values
            resolve({ time, amplitude });
          }
        },
        error: (error) => {
          console.error("PapaParse error:", error);
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error("Error fetching or parsing CSV:", error);
    throw error;
  }
}
