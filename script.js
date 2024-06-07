async function fetchHourlyWeatherData(zipCode) {
    const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=2beb72048c714687af713040240506&q=${zipCode}&days=1&hour=1`);
    const data = await response.json();
    return data.forecast.forecastday[0].hour;
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
    if (hoursPerWeek >= 7) return 0.5; // High acclimatization
    if (hoursPerWeek >= 4) return 0.75; // Moderate acclimatization
    return 1; // Low acclimatization
}

function applyWindAdjustment(adjustment, windSpeed, temp) {
    if (temp >= 80) {
        if (windSpeed > 10) adjustment -= 0.02;
        else if (windSpeed > 5) adjustment -= 0.01;
    } else if (temp >= 60) {
        if (windSpeed > 10) adjustment -= 0.01;
        else if (windSpeed > 5) adjustment -= 0.005;
    } else {
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

function applyInteractionEffects(adjustment, temp, humidity, uvIndex, windSpeed, acclimatizationScore) {
    // Temperature and Humidity Interaction
    if (temp > 80 && humidity > 60) adjustment += 0.01;
    if (temp > 90 && humidity > 70) adjustment += 0.02;

    // Temperature and UV Index Interaction
    if (temp > 80 && uvIndex > 6) adjustment += 0.01;
    if (temp > 90 && uvIndex > 8) adjustment += 0.02;

    // Wind and Temperature Interaction
    if (temp > 80) {
        if (windSpeed > 10) adjustment -= 0.02;
        else if (windSpeed > 5) adjustment -= 0.01;
    }

    // Acclimatization Interaction
    adjustment *= acclimatizationScore;

    return adjustment;
}

function calculateHydrationAdjustment(hydrationStatus) {
    if (hydrationStatus === 'well') return 1;
    if (hydrationStatus === 'moderate') return 1.05;
    if (hydrationStatus === 'poor') return 1.1;
}

function calculateWorkoutLengthAdjustment(length) {
    if (length > 90) return 1.05;
    if (length > 60) return 1.03;
    return 1;
}

function calculateHourlyAdjustments(goalPace, hourlyData, acclimatizationHours, hydrationStatus, workoutLength) {
    const adjustments = hourlyData.filter((_, index) => index % 2 === 0).map(hour => {
        const temp = hour.temp_f;
        const humidity = hour.humidity;
        const windSpeed = hour.wind_mph;
        const uvIndex = hour.uv;
        const time = hour.time;

        const dewPoint = calculateDewPoint(temp, humidity);
        let adjustment = getBaseAdjustment(temp, dewPoint);

        const acclimatizationScore = calculateAcclimatizationScore(acclimatizationHours);

        adjustment = applyWindAdjustment(adjustment, windSpeed, temp);
        adjustment = applyUVAdjustment(adjustment, uvIndex);
        adjustment = applyInteractionEffects(adjustment, temp, humidity, uvIndex, windSpeed, acclimatizationScore);

        const hydrationAdjustment = calculateHydrationAdjustment(hydrationStatus);
        const workoutLengthAdjustment = calculateWorkoutLengthAdjustment(workoutLength);

        adjustment *= hydrationAdjustment * workoutLengthAdjustment;

        const paceParts = goalPace.split(':');
        let minutes = parseInt(paceParts[0]);
        let seconds = parseInt(paceParts[1]);
        let totalSeconds = (minutes * 60) + seconds;

        totalSeconds += totalSeconds * adjustment;

        minutes = Math.floor(totalSeconds / 60);
        seconds = Math.round(totalSeconds % 60);

        const adjustedPace = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

        return { time, adjustedPace };
    });

    return adjustments;
}

async function calculateHourlyPaces() {
    const goalPace = document.getElementById('goalPace').value;
    const zipCode = document.getElementById('zipCode').value;
    const acclimatizationHours = parseFloat(document.getElementById('acclimatizationHours').value);
    const hydrationStatus = document.getElementById('hydrationStatus').value;
    const workoutLength = parseInt(document.getElementById('workoutLength').value);

    const hourlyData = await fetchHourlyWeatherData(zipCode);

    const adjustments = calculateHourlyAdjustments(goalPace, hourlyData, acclimatizationHours, hydrationStatus, workoutLength);

    renderChart(adjustments);
}

function renderChart(data) {
    const ctx = document.getElementById('adjustmentChart').getContext('2d');
    const labels = data.map(d => new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const adjustedPaces = data.map(d => parseFloat(d.adjustedPace.split(':').join('.'))); // Convert "min:sec" to decimal format for chart

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Adjusted Pace (min/mile)',
                data: adjustedPaces,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: false,
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        tooltipFormat: 'HH:mm'
                    }
                }
            }
        }
    });
}
