import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons, AntDesign } from "@expo/vector-icons";
import { useFetchFirebase } from "../hooks/useFetchFirebase";
import Analysis from "../components/Analysis";
import Graph from "../components/Graph";
import WarningNote from "../components/warningNote";
import { fetchCSV } from "../components/fetchCSV";
import { fft, util as fftUtil } from "fft-js";

export default function Home() {
  const [currentScan, setCurrentScan] = useState(null);
  const [rawData, setRawData] = useState(null); 
  const [fetchingRawData, setFetchingRawData] = useState(false); 
  const [modalVisible, setModalVisible] = useState(false);
  
  // Added state for fftData and freqs
  const [fftData, setFftData] = useState([]); 
  const [freqs, setFreqs] = useState([]); 

  const { data, loading, error } = useFetchFirebase();

  // Effect to update currentScan when data changes
  useEffect(() => {
    if (data) {
      const latestScanKey = Object.keys(data).sort((a, b) => {
        const numA = parseInt(a.split("_")[1]);
        const numB = parseInt(b.split("_")[1]);
        return numB - numA;
      })[0];

      const latestScan = { ...data[latestScanKey], key: latestScanKey };
      setCurrentScan(latestScan);
      // console.log("Displaying Data: ", latestScan);
    }
  }, [data]);

  // Effect to handle raw data fetching and FFT processing
  useEffect(() => {
    if (currentScan && currentScan.rawDataURL) {
      setFetchingRawData(true);

      // Function to find the next power of 2
      function nextPowerOfTwo(n) {
        return Math.pow(2, Math.ceil(Math.log2(n)));
      }

      fetchCSV(currentScan.rawDataURL)
        .then((parsedData) => {
          // Extract amplitude and ensure it is a numerical array
          const amplitudes = parsedData.amplitude.map(Number); // Convert to numbers if needed
          if (amplitudes.some((value) => isNaN(value))) {
            throw new Error("Amplitude data contains invalid (non-numeric) values.");
          }

          // Print first 10 amplitudes for debugging
          // console.log("Parsed Amplitude (First 10):", amplitudes.slice(0, 10));

          // Find the next power of 2 greater than or equal to the length of the amplitudes array
          const paddedLength = nextPowerOfTwo(amplitudes.length);

          // Pad the amplitudes array with zeros to the next power of 2
          const paddedAmplitudes = amplitudes.concat(new Array(paddedLength - amplitudes.length).fill(0));

          // Debug: Print padded amplitudes (First 10 after padding)
          // console.log("Padded Amplitudes (First 10):", paddedAmplitudes.slice(0, 10));

          // Apply FFT to the padded amplitudes
          const fftResult = fft(paddedAmplitudes);
        

          // Compute Magnitudes (magnitude = sqrt(real^2 + imaginary^2))
          const magnitudes = fftResult.map(c => Math.sqrt(c[0] ** 2 + c[1] ** 2));

          // Debug: Log the first 10 magnitudes
          // console.log("FFT Magnitudes:", magnitudes.slice(0, 10));

          // Compute Frequencies
          const samplingRate = 200000; // Given sampling rate
          const frequencies = fftUtil.fftFreq(fftResult, samplingRate);

          // Debug: Log the first 10 frequencies
          // console.log("Frequencies:", frequencies.slice(0, 10));

          // Update state with FFT results and frequencies
          setFftData(magnitudes);
          setFreqs(frequencies);
        })
        .catch((error) => {
          console.error("Error fetching raw data:", error);
        });
    }
  }, [currentScan]);

  // Reset function
  const handleReset = () => {
    setCurrentScan(null);
    setRawData(null); 
  };

  // Modal handling
  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  // Loading and error handling
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (error) {
    return <Text style={styles.error}>Error: {error}</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>iECHO</Text>
        <View style={styles.sideButtonsContainer}>
          <TouchableOpacity onPress={handleOpenModal}>
            <AntDesign name="exclamationcircle" size={32} color="#ff6500" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.restartButton}
            onPress={handleReset}
          >
            <MaterialIcons
              name="restart-alt"
              size={36}
              color="#ff6500"
            />
          </TouchableOpacity>
        </View>
      </View>

      {currentScan && (
        <>
          <View style={styles.signalDataContainer}>
          <View style={styles.graphPlaceholder}>
  {fftData.length > 0 && freqs.length > 0 ? (
    <Graph freqs={freqs} fftData={fftData} />
  ) : (
    <ActivityIndicator size="large" color="#ffffff" />
  )}
</View>
          </View>
          <View style={styles.analysisContainer}>
            <Analysis quality={currentScan.quality} />
          </View>
        </>
      )}

      {!currentScan && (
        <View style={styles.fullScreenCenter}>
          <Text style={styles.noData}>
            No scans available. Please reload or add new scans.
          </Text>
        </View>
      )}

      <WarningNote visible={modalVisible} onClose={handleCloseModal} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 15,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    fontStyle: "italic",
    letterSpacing: 10,
    color: "#F1F3F4",
  },
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    alignContent: "center",
    paddingVertical: 50,
  },
  sideButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
  },
  error: {
    textAlign: "center",
    color: "red",
    marginTop: 20,
    fontSize: 20,
  },
  fullScreenCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    paddingHorizontal: 20,
  },
  noData: {
    textAlign: "center",
    color: "white",
    fontSize: 20,
  },
  qualityTitleContainer: {
    position: "relative",
    margin: 2,
    marginLeft: 20,
  },
  qualityTitle: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 3,
    color: "#F1F3F4",
  },
  graphPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  analysisContainer: {
    marginHorizontal: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    paddingVertical: 50,
  },
});
