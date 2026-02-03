import { useEffect, useState } from "react";
import { getWeather } from "../api/weather";

export default function WeatherCard({ city = "Belgrade" }) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    getWeather(city)
      .then(setWeather)
      .catch(console.error);
  }, [city]);

  if (!weather) return <div>Učitavam prognozu…</div>;

  return (
<div className="weather-card">
      <h4 className="mb-2">🌤 Vrijeme u {weather.city}</h4>
      <p>{weather.description}</p>
      <p>🌡️ {weather.temperature}°C (osjećaj {weather.feels_like}°C)</p>
      <p>💧 Vlažnost: {weather.humidity}%</p>
      <p>💨 Vjetar: {weather.wind} m/s</p>
    </div>
  );
}
