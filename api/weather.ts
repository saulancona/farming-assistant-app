import type { VercelRequest, VercelResponse } from '@vercel/node';

// Server-side only API key
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Map OpenWeather condition codes to simplified icons
function mapWeatherIcon(main: string): string {
  if (main.toLowerCase().includes('clear') || main.toLowerCase().includes('sun')) {
    return 'sunny';
  } else if (main.toLowerCase().includes('cloud')) {
    return 'cloudy';
  } else if (main.toLowerCase().includes('rain') || main.toLowerCase().includes('drizzle')) {
    return 'rainy';
  } else if (main.toLowerCase().includes('snow')) {
    return 'snowy';
  } else if (main.toLowerCase().includes('thunder')) {
    return 'stormy';
  }
  return 'cloudy';
}

// Convert Kelvin to Celsius
function kelvinToCelsius(kelvin: number): number {
  return Math.round(kelvin - 273.15);
}

// Get day name from timestamp
function getDayName(timestamp: number, index: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = new Date(timestamp * 1000);
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return days[date.getDay()];
}

// Evaluate spray window conditions
function evaluateSprayWindow(currentData: any, forecastData: any[]): { isIdeal: boolean; reason: string } {
  const windSpeed = currentData.wind?.speed || 0;
  const hasRain = forecastData.slice(0, 8).some(item =>
    item.weather[0].main.toLowerCase().includes('rain')
  );

  if (windSpeed > 5) { // 5 m/s = ~18 km/h
    return {
      isIdeal: false,
      reason: 'Wind speed too high for effective spraying'
    };
  }

  if (hasRain) {
    return {
      isIdeal: false,
      reason: 'Rain expected in the next 24 hours'
    };
  }

  return {
    isIdeal: true,
    reason: 'Low wind speed and no rain expected for next 24 hours'
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET requests for weather data
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!OPENWEATHER_API_KEY) {
    return res.status(500).json({ error: 'Weather service not configured' });
  }

  try {
    const { lat, lon } = req.query;

    // Default to Nairobi, Kenya if no coordinates provided
    const latitude = lat ? parseFloat(lat as string) : -1.2864;
    const longitude = lon ? parseFloat(lon as string) : 36.8172;

    // Fetch current weather and forecast
    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(`${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`),
      fetch(`${BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`)
    ]);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error(`Weather API error: ${currentResponse.statusText || forecastResponse.statusText}`);
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    // Process forecast data - group by day
    const forecastByDay = new Map();
    forecastData.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000);
      const dayKey = date.toDateString();

      if (!forecastByDay.has(dayKey)) {
        forecastByDay.set(dayKey, {
          temps: [],
          weather: item.weather[0],
          dt: item.dt
        });
      }
      forecastByDay.get(dayKey).temps.push(item.main.temp);
    });

    // Convert to array and take first 5 days
    const dailyForecasts: any[] = [];
    let dayIndex = 0;
    for (const [_, dayData] of forecastByDay) {
      if (dayIndex >= 5) break;
      dailyForecasts.push({
        dt: dayData.dt,
        temp: {
          min: Math.min(...dayData.temps),
          max: Math.max(...dayData.temps)
        },
        weather: [dayData.weather]
      });
      dayIndex++;
    }

    // Build response
    const weatherData = {
      current: {
        temp: kelvinToCelsius(currentData.main.temp),
        condition: currentData.weather[0].main,
        humidity: currentData.main.humidity,
        windSpeed: Math.round(currentData.wind.speed * 3.6), // m/s to km/h
        icon: mapWeatherIcon(currentData.weather[0].main)
      },
      forecast: dailyForecasts.map((day, index) => ({
        day: getDayName(day.dt, index),
        high: kelvinToCelsius(day.temp.max),
        low: kelvinToCelsius(day.temp.min),
        condition: day.weather[0].main,
        icon: mapWeatherIcon(day.weather[0].main)
      })),
      sprayWindow: evaluateSprayWindow(currentData, forecastData.list)
    };

    // Set cache headers (1 hour)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    return res.status(200).json(weatherData);
  } catch (error: any) {
    console.error('Weather API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch weather data',
      details: error.message
    });
  }
}
