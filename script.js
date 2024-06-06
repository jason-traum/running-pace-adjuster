async function fetchWeatherData(location, date, time) {
    const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=2beb72048c714687af713040240506&q=${location}&dt=${date}`);
    const data = await response.json();
    const forecastHour = data.forecast.forecastday[0].hour.find(hour => hour.time.includes(time));
    const temp = forecastHour.temp_f;
    const humidity = forecastHour.humidity;
    const condition = forecastHour.condition.text;
    const windSpeed = forecastHour.wind_mph;
    const uvIndex = forecastHour.uv;
    return { temp, humidity, condition, windSpeed, uvIndex };
}

function calculateDewPoint(temp, humidity) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
    const dewPoint = (b * alpha) / (a - alpha);
    return dewPoint;
}

function getBaseAdjustment(temp, dewPoint) {
    const combined = temp + dewPoint;
    if (combined <= 100) return 0;
    if (combined <= 110) return 0.005;
    if (combined <= 120) return 0.01;
    if (combined <= 130) return 0.02;
    if (combined <= 140) return 0.03;
    if (combined <= 150) return 0.045;
    if (combined <= 160) return 0.06;
    if (combined <= 170) return 0.08;
    return 0.1;
}

function calculateAcclimatizationScore(hoursPerWeek) {
    if (hoursPerWeek >= 14) return 0.5; // High acclimatization
    if (hoursPerWeek >= 8) return 0.75; // Moderate acclimatization
    return 1; // Low acclimatization
}

function applyWindAdjustment(adjustment, windSpeed, temp) {
    if (temp >= 80) {
        // Wind provides more relief in hotter conditions
        if (windSpeed > 10) adjustment -= 0.02;
        else if (windSpeed > 5) adjustment -= 0.01;
    } else if (temp >= 60) {
        // Wind provides some relief in moderate conditions
        if (windSpeed > 10) adjustment -= 0.01;
        else if (windSpeed > 5) adjustment -= 0.005;
    } else {
        // Wind has minimal effect in cooler conditions
        if (windSpeed > 10) adjustment -= 0.005;
        else if (windSpeed > 5) adjustment -= 0.0025;
    }
    return adjustment;
}

function applyUVAdjustment(adjustment, uvIndex) {
    if (uvIndex > 8) adjustment += 0.01;
    else if (uvIndex > 6) adjustment += 0.005;
    return adjustment;
}

function applyInteractionEffects(adjustment, temp, humidity, uvIndex, acclimatizationScore) {
    // Temperature and Humidity Interaction
    if (temp > 80 && humidity > 60) adjustment += 0.01;
    if (temp > 90 && humidity > 70) adjustment += 0.02;

    // Temperature and UV Index Interaction
    if (temp > 80 && uvIndex > 6) adjustment += 0.01;
    if (temp > 90 && uvIndex > 8) adjustment += 0.02;

    // Acclimatization Interaction
    adjustment *= acclimatizationScore;

    return adjustment;
}

function calculatePaceAdjustment(goalPace, temp, humidity, acclimatizationHours, windSpeed, uvIndex) {
    const dewPoint = calculateDewPoint(temp, humidity);
    let adjustment = getBaseAdjustment(temp, dewPoint);

    // Calculate Acclimatization Score
    const acclimatizationScore = calculateAcclimatizationScore(acclimatizationHours);

    // Apply Wind Adjustment
    adjustment = applyWindAdjustment(adjustment, windSpeed, temp);

    // Apply UV Index Adjustment
    adjustment = applyUVAdjustment(adjustment, uvIndex);

    // Apply Interaction Effects
    adjustment = applyInteractionEffects(adjustment, temp, humidity, uvIndex, acclimatizationScore);

    // Convert goal pace to seconds
    const paceParts = goalPace.split(':');
    let minutes = parseInt(paceParts[0]);
    let seconds = parseInt(paceParts[1]);
    let totalSeconds = (minutes * 60) + seconds;

    // Apply adjustment (in seconds per mile)
    totalSeconds += totalSeconds * adjustment;

    // Convert total seconds back to minutes and seconds
    minutes = Math.floor(totalSeconds / 60);
    seconds = Math.round(totalSeconds % 60);

    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
}

async function calculateAdjustedPace() {
    const goalPace = document.getElementById('goalPace').value;
    const expectedTime = document.getElementById('expectedTime').value;
    const location = document.getElementById('location').value;
    const date = document.getElementById('date').value;
    const acclimatizationHours = parseFloat(document.getElementById('acclimatizationHours').value);

    try {
        const { temp, humidity, condition, windSpeed, uvIndex } = await fetchWeatherData(location, date, expectedTime);
        const dewPoint = calculateDewPoint(temp, humidity);
        const adjustedPace = calculatePaceAdjustment(goalPace, temp, humidity, acclimatizationHours, windSpeed, uvIndex);

        document.getElementById('result').innerText = `Adjusted Pace: ${adjustedPace}`;
        document.getElementById('weather-info').innerHTML = `
            <p><strong>Weather Information:</strong></p>
            <p>Temperature: ${temp}°F</p>
            <p>Dew Point: ${dewPoint.toFixed(2)}°F</p>
            <p>Humidity: ${humidity}%</p>
            <p>Condition: ${condition}</p>
            <p>Wind Speed: ${windSpeed} mph</p>
        `;
    } catch (error) {
        document.getElementById('result').innerText = `Error: ${error.message}`;
    }
}