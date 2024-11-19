import { useQuery, useQueryClient } from 'react-query';
import { db } from "../services/firebase/config";
import { ref, query, onValue, off } from "firebase/database";

/**
 * Custom hook for fetching Firebase data with real-time updates and caching.
 *
 * @param {string} reloadKey - Unique key to differentiate cache entries.
 * @param {object} options - Additional options for query and filters.
 *   @param {string} options.path - Path to the Firebase data (default: root /).
 *   @param {Array} options.filters - Array of Firebase query filters (e.g., orderByChild, limitToLast).
 * @returns {object} Query result object from react-query (data, isLoading, error, etc.).
 */
function useFetchFirebase(reloadKey, options = {}) {
  const queryClient = useQueryClient();

  return useQuery(
    ['firebaseData', reloadKey],
    () =>
      new Promise((resolve, reject) => {
        const dataRef = query(
          ref(db, options.path || '/'), // Path to the data (default: root)
          ...(options.filters || [])    // Apply filters if provided
        );

        // Real-time listener for Firebase data
        const unsubscribe = onValue(
          dataRef,
          (snapshot) => {
            const fetchedData = snapshot.val();
            if (fetchedData) {
              queryClient.setQueryData(['firebaseData', reloadKey], fetchedData); // Update cache
              resolve(fetchedData); // Resolve promise with data
            } else {
              resolve(null); // Resolve as null if no data
            }
          },
          (error) => {
            console.error("Error fetching Firebase data:", error);
            reject(error); // Reject promise on error
          }
        );

        // Cleanup function to remove Firebase listener
        return () => off(dataRef);
      }),
    {
      refetchOnWindowFocus: false, // Avoid refetching on window focus
      refetchInterval: false,      // Disable polling
      staleTime: Infinity,         // Prevent automatic stale state
      cacheTime: 5 * 60 * 1000,    // Cache for 5 minutes
      onSuccess: (data) => {
        // Process the data to extract the latest scan based on timestamp
        if (data) {
          // Convert the fetched data into an array of scans
          const scansArray = Object.entries(data).map(([key, value]) => ({
            id: key,
            ...value,
          }));

          // Sort the scans array by timestamp (assuming timestamp is a valid date string)
          const sortedScans = scansArray.sort((a, b) => {
            const parseDate = (timestamp) => {
              const [day, month, year, time] = timestamp.split(/[/\s]/);
              return new Date(`${year}-${month}-${day}T${time}`);
            };

            return parseDate(b.timestamp) - parseDate(a.timestamp); // Sort descending
          });

          // Get the most recent scan (first in the sorted array based on timestamp)
          const latestScan = sortedScans[0];
          console.log("Latest scan ID:", latestScan.id, "Timestamp:", latestScan.timestamp); // Log the ID and timestamp
          
          // You can use the latestScan here to update your UI, state, etc.
        }
      },
      onError: (error) => {
        console.error("Error in Firebase query:", error);
      },
    }
  );
}

export { useFetchFirebase };
