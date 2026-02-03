export async function getWeather(city) {
  const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error("Weather fetch failed");
  return res.json();
}
