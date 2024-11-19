import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CartesianChart, Line, Area, useChartPressState } from "victory-native";
import { LinearGradient, useFont, vec } from "@shopify/react-native-skia";

const inter = require("../assets/fonts/Inter-Regular.ttf");
const interBold = require("../assets/fonts/Inter-Bold.ttf");

// Function to downsample data
function downsample(array, targetPoints) {
  if (!array || array.length === 0) {
    return [];
  }

  const ratio = Math.ceil(array.length / targetPoints);
  const result = [];

  for (let i = 0; i < targetPoints; i++) {
    const start = i * ratio;
    const end = start + ratio >= array.length ? array.length : start + ratio;
    const window = array.slice(start, end);

    // Calculate average or representative value for the window
    const average = window.reduce((sum, value) => sum + value, 0) / window.length;
    result.push(average);
  }

  return result;
}

export default function Graph({ freqs, fftData }) {
  const font = useFont(inter, 8);
  const chartFont = useFont(interBold, 14);

  // State to hold chart data
  const [chartData, setChartData] = useState([]);

  // Effect to update chartData when frequency and fftData change
  useEffect(() => {
    if (freqs && fftData) {
      // Get the first half of the frequencies and FFT magnitudes
      const halfLength = Math.floor(freqs.length / 2);
      const filteredFreqs = freqs.slice(0, halfLength);
      const filteredFftData = fftData.slice(0, halfLength);

      // Optionally downsample the data if it's too large
      const downsampledFreqs = downsample(filteredFreqs, 500);
      const downsampledFftData = downsample(filteredFftData, 500);

      // Limit the frequencies to 10,000 max
      const limitedFreqs = downsampledFreqs.filter(freq => freq <= 5000);
      const limitedFftData = limitedFreqs.map((_, index) => downsampledFftData[index]);

      // Scale down the fftData by dividing by 1,000,000 to reduce its magnitude
      const scaledFftData = limitedFftData.map(magnitude => magnitude / 1000000); // Adjust this scale factor as needed

      // Format data for CartesianChart
      const DATA = limitedFreqs.map((freq, index) => ({
        freq: freq,
        magnitude: scaledFftData[index],
      }));

      setChartData(DATA);
    }
  }, [freqs, fftData]);

  // Calculate dynamicWidth based on the number of visible data points
  const baseWidthPerDataPoint = 33;
  const dynamicWidth = Math.min(chartData.length * baseWidthPerDataPoint, 10 * baseWidthPerDataPoint);

  const { state, isActive } = useChartPressState({ x: 0, y: { magnitude: 0 } });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={[styles.card, { width: dynamicWidth }]}>
          <CartesianChart
            data={chartData}
            xKey="freq"
            yKeys={["magnitude"]}
            domainPadding={{ top: 30 }}
            axisOptions={{
              font,
              labelColor: "white",
              lineColor: "white",
              tickCount: {
                x: Math.min(chartData.length, 10),
                y: 7,
              },
              x: {
                domain: [0, 10000], // Limit the x-axis to 10,000
                tickValues: Array.from({ length: 11 }, (_, i) => i * 1000), // Increments of 1000
              },
              y: {
                domain: [0, 10], // Limit the y-axis to a maximum of 10 (adjust this value as needed)
              },
            }}
            chartPressState={state}
          >
            {({ points, chartBounds }) => (
              <>
                <Line
                  points={points.magnitude}
                  color="lightgreen"
                  strokeWidth={3}
                  animate={{ type: "timing", duration: 100 }}
                />
                <Area
                  points={points.magnitude}
                  y0={chartBounds.bottom}
                  animate={{ type: "timing", duration: 100 }}
                >
                  <LinearGradient
                    start={vec(chartBounds.bottom, 200)}
                    end={vec(chartBounds.bottom, chartBounds.bottom)}
                    colors={["green", "#90ee9050"]}
                  />
                </Area>
              </>
            )}
          </CartesianChart>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    height: 315,
    margin: 10,
    borderRadius: 20,
  },
});
