async function fetchWeatherData(location, date) {
    const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=2beb72048c714687af713040240506&q=${location}&dt=${date}`);
    const data = await response.json();
    const forecast = data.forecast.forecastday[0].day;
    const temp = forecast.avgtemp_f;
    const humidity = forecast.avghumidity;
    const condition = forecast.condition.text;
    return { temp, humidity, condition };
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

function getUserAdjustments(sweatRate, acclimation, fitnessLevel) {
    let adjustment = 0;
    const adjustments = [];

    // Sweat Rate adjustment
    if (sweatRate > 1.5) adjustments.push(0.01);
    else if (sweatRate > 1.0) adjustments.push(0.005);

    // Heat Acclimation adjustment
    if (acclimation === 'low') adjustments.push(0.01);
    else if (acclimation === 'moderate') adjustments.push(0.005);

    // Fitness Level adjustment
    if (fitnessLevel === 'beginner') adjustments.push(0.01);
    else if (fitnessLevel === 'intermediate') adjustments.push(0.005);

    // Apply diminishing returns
    adjustments.forEach((adj, index) => {
        adjustment += adj / (index + 1);
    });

    return adjustment;
}

function calculatePaceAdjustment(goalPace, temp, humidity, sweatRate, acclimation, fitnessLevel) {
    const dewPoint = calculateDewPoint(temp, humidity);
    let adjustment = getBaseAdjustment(temp, dewPoint);

    // Get user-specific adjustments
    const userAdjustment = getUserAdjustments(sweatRate, acclimation, fitnessLevel);

    // Apply both adjustments
    adjustment += userAdjustment;

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
    const sweatRate = parseFloat(document.getElementById('sweatRate').value);
    const acclimation = document.getElementById('acclimation').value;
    const fitnessLevel = document.getElementById('fitnessLevel').value;

    try {
        const { temp, humidity, condition } = await fetchWeatherData(location, date);
        const dewPoint = calculateDewPoint(temp, humidity);
        const adjustedPace = calculatePaceAdjustment(goalPace, temp, humidity, sweatRate, acclimation, fitnessLevel);

        document.getElementById('result').innerText = `Adjusted Pace: ${adjustedPace}`;
        document.getElementById('weather-info').innerHTML = `
            <p><strong>Weather Information:</strong></p>
            <p>Temperature: ${temp}°F</p>
            <p>Dew Point: ${dewPoint.toFixed(2)}°F</p>
            <p>Humidity: ${humidity}%</p>
            <p>Condition: ${condition}</p>
        `;
    } catch (error) {
        document.getElementById('result').innerText = `Error: ${error.message}`;
    }
}
