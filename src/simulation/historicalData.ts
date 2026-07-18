/**
 * Illustrative historical annual return series (nominal) for a broad US stock
 * index, intermediate government bonds, Treasury bills (cash), and CPI
 * inflation.
 *
 * ⚠️ THESE ARE REPRESENTATIVE APPROXIMATIONS assembled for demonstration and
 * testing. They are close in spirit to well-known long-run datasets (e.g.
 * Shiller / Damodaran) but are NOT an authoritative or licensed reproduction.
 * To use the historical and bootstrap methods for real analysis, replace this
 * file with a licensed dataset. See docs/UPDATING_DATA.md for the exact shape
 * and steps. The engine never silently extrapolates beyond this range.
 */

export interface HistoricalYear {
  year: number;
  stocks: number; // nominal total return
  bonds: number; // nominal total return
  cash: number; // nominal T-bill return
  inflation: number; // CPI inflation
}

export const HISTORICAL_SERIES: HistoricalYear[] = [
  { year: 1928, stocks: 0.438, bonds: 0.008, cash: 0.031, inflation: -0.012 },
  { year: 1929, stocks: -0.083, bonds: 0.042, cash: 0.048, inflation: 0.006 },
  { year: 1930, stocks: -0.251, bonds: 0.045, cash: 0.024, inflation: -0.064 },
  { year: 1931, stocks: -0.438, bonds: -0.026, cash: 0.011, inflation: -0.093 },
  { year: 1932, stocks: -0.086, bonds: 0.088, cash: 0.009, inflation: -0.103 },
  { year: 1933, stocks: 0.499, bonds: 0.019, cash: 0.003, inflation: 0.008 },
  { year: 1934, stocks: -0.014, bonds: 0.08, cash: 0.002, inflation: 0.015 },
  { year: 1935, stocks: 0.467, bonds: 0.045, cash: 0.002, inflation: 0.03 },
  { year: 1936, stocks: 0.319, bonds: 0.05, cash: 0.002, inflation: 0.012 },
  { year: 1937, stocks: -0.352, bonds: 0.014, cash: 0.003, inflation: 0.031 },
  { year: 1938, stocks: 0.294, bonds: 0.042, cash: -0.001, inflation: -0.028 },
  { year: 1939, stocks: -0.011, bonds: 0.045, cash: 0.0, inflation: -0.005 },
  { year: 1940, stocks: -0.107, bonds: 0.054, cash: 0.0, inflation: 0.007 },
  { year: 1941, stocks: -0.128, bonds: 0.02, cash: 0.001, inflation: 0.099 },
  { year: 1942, stocks: 0.194, bonds: 0.023, cash: 0.003, inflation: 0.09 },
  { year: 1943, stocks: 0.259, bonds: 0.025, cash: 0.004, inflation: 0.03 },
  { year: 1944, stocks: 0.198, bonds: 0.028, cash: 0.003, inflation: 0.021 },
  { year: 1945, stocks: 0.364, bonds: 0.061, cash: 0.003, inflation: 0.023 },
  { year: 1946, stocks: -0.081, bonds: 0.0, cash: 0.004, inflation: 0.181 },
  { year: 1947, stocks: 0.057, bonds: -0.011, cash: 0.005, inflation: 0.088 },
  { year: 1948, stocks: 0.055, bonds: 0.019, cash: 0.008, inflation: 0.03 },
  { year: 1949, stocks: 0.187, bonds: 0.047, cash: 0.011, inflation: -0.021 },
  { year: 1950, stocks: 0.317, bonds: 0.004, cash: 0.012, inflation: 0.059 },
  { year: 1951, stocks: 0.24, bonds: -0.003, cash: 0.015, inflation: 0.06 },
  { year: 1952, stocks: 0.184, bonds: 0.023, cash: 0.017, inflation: 0.008 },
  { year: 1953, stocks: -0.01, bonds: 0.038, cash: 0.019, inflation: 0.007 },
  { year: 1954, stocks: 0.524, bonds: 0.031, cash: 0.009, inflation: -0.007 },
  { year: 1955, stocks: 0.313, bonds: -0.007, cash: 0.017, inflation: 0.004 },
  { year: 1956, stocks: 0.066, bonds: -0.023, cash: 0.025, inflation: 0.029 },
  { year: 1957, stocks: -0.106, bonds: 0.068, cash: 0.032, inflation: 0.03 },
  { year: 1958, stocks: 0.435, bonds: -0.021, cash: 0.015, inflation: 0.018 },
  { year: 1959, stocks: 0.12, bonds: -0.026, cash: 0.03, inflation: 0.015 },
  { year: 1960, stocks: 0.003, bonds: 0.117, cash: 0.029, inflation: 0.014 },
  { year: 1961, stocks: 0.268, bonds: 0.019, cash: 0.021, inflation: 0.007 },
  { year: 1962, stocks: -0.087, bonds: 0.057, cash: 0.027, inflation: 0.013 },
  { year: 1963, stocks: 0.226, bonds: 0.017, cash: 0.031, inflation: 0.016 },
  { year: 1964, stocks: 0.164, bonds: 0.037, cash: 0.035, inflation: 0.01 },
  { year: 1965, stocks: 0.124, bonds: 0.007, cash: 0.039, inflation: 0.019 },
  { year: 1966, stocks: -0.1, bonds: 0.036, cash: 0.047, inflation: 0.034 },
  { year: 1967, stocks: 0.238, bonds: -0.019, cash: 0.042, inflation: 0.03 },
  { year: 1968, stocks: 0.108, bonds: 0.025, cash: 0.052, inflation: 0.047 },
  { year: 1969, stocks: -0.082, bonds: -0.05, cash: 0.065, inflation: 0.062 },
  { year: 1970, stocks: 0.035, bonds: 0.169, cash: 0.065, inflation: 0.056 },
  { year: 1971, stocks: 0.142, bonds: 0.093, cash: 0.043, inflation: 0.033 },
  { year: 1972, stocks: 0.189, bonds: 0.028, cash: 0.039, inflation: 0.034 },
  { year: 1973, stocks: -0.146, bonds: 0.037, cash: 0.068, inflation: 0.087 },
  { year: 1974, stocks: -0.263, bonds: 0.02, cash: 0.08, inflation: 0.123 },
  { year: 1975, stocks: 0.372, bonds: 0.081, cash: 0.058, inflation: 0.069 },
  { year: 1976, stocks: 0.238, bonds: 0.157, cash: 0.05, inflation: 0.049 },
  { year: 1977, stocks: -0.072, bonds: 0.03, cash: 0.051, inflation: 0.067 },
  { year: 1978, stocks: 0.066, bonds: 0.007, cash: 0.072, inflation: 0.09 },
  { year: 1979, stocks: 0.184, bonds: 0.012, cash: 0.104, inflation: 0.133 },
  { year: 1980, stocks: 0.322, bonds: -0.003, cash: 0.112, inflation: 0.125 },
  { year: 1981, stocks: -0.049, bonds: 0.082, cash: 0.146, inflation: 0.089 },
  { year: 1982, stocks: 0.215, bonds: 0.324, cash: 0.107, inflation: 0.039 },
  { year: 1983, stocks: 0.225, bonds: 0.083, cash: 0.088, inflation: 0.038 },
  { year: 1984, stocks: 0.062, bonds: 0.15, cash: 0.098, inflation: 0.04 },
  { year: 1985, stocks: 0.315, bonds: 0.211, cash: 0.077, inflation: 0.038 },
  { year: 1986, stocks: 0.185, bonds: 0.151, cash: 0.061, inflation: 0.011 },
  { year: 1987, stocks: 0.052, bonds: 0.028, cash: 0.058, inflation: 0.044 },
  { year: 1988, stocks: 0.165, bonds: 0.07, cash: 0.066, inflation: 0.044 },
  { year: 1989, stocks: 0.317, bonds: 0.174, cash: 0.083, inflation: 0.046 },
  { year: 1990, stocks: -0.031, bonds: 0.062, cash: 0.078, inflation: 0.061 },
  { year: 1991, stocks: 0.305, bonds: 0.15, cash: 0.056, inflation: 0.031 },
  { year: 1992, stocks: 0.076, bonds: 0.094, cash: 0.035, inflation: 0.029 },
  { year: 1993, stocks: 0.1, bonds: 0.142, cash: 0.029, inflation: 0.027 },
  { year: 1994, stocks: 0.013, bonds: -0.081, cash: 0.039, inflation: 0.027 },
  { year: 1995, stocks: 0.372, bonds: 0.234, cash: 0.055, inflation: 0.025 },
  { year: 1996, stocks: 0.23, bonds: 0.014, cash: 0.051, inflation: 0.033 },
  { year: 1997, stocks: 0.334, bonds: 0.098, cash: 0.052, inflation: 0.017 },
  { year: 1998, stocks: 0.286, bonds: 0.147, cash: 0.049, inflation: 0.016 },
  { year: 1999, stocks: 0.21, bonds: -0.082, cash: 0.047, inflation: 0.027 },
  { year: 2000, stocks: -0.091, bonds: 0.168, cash: 0.059, inflation: 0.034 },
  { year: 2001, stocks: -0.119, bonds: 0.055, cash: 0.039, inflation: 0.016 },
  { year: 2002, stocks: -0.221, bonds: 0.152, cash: 0.017, inflation: 0.024 },
  { year: 2003, stocks: 0.287, bonds: 0.002, cash: 0.011, inflation: 0.019 },
  { year: 2004, stocks: 0.109, bonds: 0.043, cash: 0.014, inflation: 0.033 },
  { year: 2005, stocks: 0.049, bonds: 0.028, cash: 0.031, inflation: 0.034 },
  { year: 2006, stocks: 0.158, bonds: 0.019, cash: 0.048, inflation: 0.025 },
  { year: 2007, stocks: 0.055, bonds: 0.1, cash: 0.047, inflation: 0.041 },
  { year: 2008, stocks: -0.37, bonds: 0.201, cash: 0.016, inflation: 0.001 },
  { year: 2009, stocks: 0.264, bonds: -0.114, cash: 0.001, inflation: 0.027 },
  { year: 2010, stocks: 0.151, bonds: 0.085, cash: 0.001, inflation: 0.015 },
  { year: 2011, stocks: 0.021, bonds: 0.164, cash: 0.001, inflation: 0.03 },
  { year: 2012, stocks: 0.16, bonds: 0.03, cash: 0.001, inflation: 0.017 },
  { year: 2013, stocks: 0.324, bonds: -0.091, cash: 0.001, inflation: 0.015 },
  { year: 2014, stocks: 0.137, bonds: 0.105, cash: 0.0, inflation: 0.008 },
  { year: 2015, stocks: 0.014, bonds: 0.011, cash: 0.0, inflation: 0.007 },
  { year: 2016, stocks: 0.119, bonds: 0.002, cash: 0.003, inflation: 0.021 },
  { year: 2017, stocks: 0.217, bonds: 0.028, cash: 0.008, inflation: 0.021 },
  { year: 2018, stocks: -0.044, bonds: 0.001, cash: 0.019, inflation: 0.019 },
  { year: 2019, stocks: 0.315, bonds: 0.096, cash: 0.021, inflation: 0.023 },
  { year: 2020, stocks: 0.184, bonds: 0.113, cash: 0.005, inflation: 0.014 },
  { year: 2021, stocks: 0.287, bonds: -0.044, cash: 0.0, inflation: 0.07 },
  { year: 2022, stocks: -0.181, bonds: -0.174, cash: 0.015, inflation: 0.065 },
  { year: 2023, stocks: 0.262, bonds: 0.057, cash: 0.05, inflation: 0.034 },
];

export const HISTORICAL_RANGE = {
  start: HISTORICAL_SERIES[0].year,
  end: HISTORICAL_SERIES[HISTORICAL_SERIES.length - 1].year,
  count: HISTORICAL_SERIES.length,
};
