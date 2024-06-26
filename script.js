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

function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

function calculatePaceAdjustment(goalPace, temp, humidity, hydrationLevel, acclimatization, workoutLength) {
    const dewPoint = calculateDewPoint(temp, humidity);
    const combined = temp + dewPoint;

    // Base adjustment using a continuous function
    const baseAdjustment = sigmoid((combined - 110) / 10) * 0.02; // Adjusted base

    // Hydration adjustment (only if not fully hydrated)
    const hydrationAdjustment = hydrationLevel < 50 ? sigmoid((50 - hydrationLevel) / 10) * 0.03 : 0; // Reduced impact

    // Acclimatization adjustment (scaled by temperature)
    const tempFactor = (temp - 60) / 40;
    const acclimatizationAdjustment = sigmoid(acclimatization / 10) * 0.02 * (1 + tempFactor); // Reduced impact

    // Workout length adjustment (scaled by temperature)
    const workoutLengthAdjustment = sigmoid((workoutLength - 60) / 10) * 0.02 * (1 + tempFactor); // Reduced impact

    // Interaction effects for humidity
    const humidityFactor = humidity / 100;
    const adjustedHydration = hydrationAdjustment * (1 + humidityFactor);

    let adjustment = baseAdjustment + adjustedHydration - acclimatizationAdjustment + workoutLengthAdjustment;

    console.log(`Base Adjustment: ${baseAdjustment}`);
    console.log(`Hydration Adjustment: ${adjustedHydration}`);
    console.log(`Acclimatization Adjustment: ${acclimatizationAdjustment}`);
    console.log(`Workout Length Adjustment: ${workoutLengthAdjustment}`);
    console.log(`Total Adjustment: ${adjustment}`);

    // Split goal pace into minutes and seconds
    const paceParts = goalPace.split(":");
    let minutes = parseInt(paceParts[0]);
    let seconds = parseInt(paceParts[1]);
    let totalSeconds = (minutes * 60) + seconds;

    // Apply adjustment (in seconds per mile)
    totalSeconds += totalSeconds * adjustment;

    // Convert total seconds back to minutes and seconds
    minutes = Math.floor(totalSeconds / 60);
    seconds = Math.round(totalSeconds % 60);

    return {
        adjustedPace: `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`,
        details: {
            baseAdjustment,
            adjustedHydration,
            acclimatizationAdjustment,
            workoutLengthAdjustment,
            totalAdjustment: adjustment
        }
    };
}

async function calculateAdjustedPace() {
    const goalPace = document.getElementById("goalPace").value;
    const expectedTime = document.getElementById("expectedTime").value;
    const location = document.getElementById("location").value;
    const date = document.getElementById("date").value;
    const hydrationLevel = parseInt(document.getElementById("hydrationStatus").value);
    const acclimatization = parseInt(document.getElementById("acclimatization").value);
    const workoutLength = parseInt(document.getElementById("workoutLength").value);

    try {
        const { temp, humidity, condition } = await fetchWeatherData(location, date);
        const dewPoint = calculateDewPoint(temp, humidity);
        const { adjustedPace, details } = calculatePaceAdjustment(goalPace, temp, humidity, hydrationLevel, acclimatization, workoutLength);

        document.getElementById("result").innerText = `Adjusted Pace: ${adjustedPace}`;
        document.getElementById("weather-info").innerHTML = `
            <p><strong>Weather Information:</strong></p>
            <p>Temperature: ${temp}°F</p>
            <p>Dew Point: ${dewPoint.toFixed(2)}°F</p>
            <p>Humidity: ${humidity}%</p>
            <p>Condition: ${condition}</p>
        `;
        document.getElementById("adjustment-details").innerHTML = `
            <p><strong>Adjustment Details:</strong></p>
            <p>Base Adjustment: ${(details.baseAdjustment * 100).toFixed(2)}%</p>
            <p>Hydration Adjustment: ${(details.adjustedHydration * 100).toFixed(2)}%</p>
            <p>Acclimatization Adjustment: ${(details.acclimatizationAdjustment * 100).toFixed(2)}%</p>
            <p>Workout Length Adjustment: ${(details.workoutLengthAdjustment * 100).toFixed(2)}%</p>
            <p>Total Adjustment: ${(details.totalAdjustment * 100).toFixed(2)}%</p>
        `;
        // Show the results and details
        document.getElementById("result").style.display = 'block';
        document.getElementById("weather-info").style.display = 'block';
        document.getElementById("adjustment-details").style.display = 'block';
    } catch (error) {
        document.getElementById("result").innerText = `Error: ${error.message}`;
        document.getElementById("result").style.display = 'block';
    }
}

// Set current date as default value
document.getElementById("date").value = new Date().toISOString().substring(0, 10);

function applyTheme() {
    const themes = [
        { bg: "#E0F7FA", fg: "#0B032D", button: "#D88C9A", secondary: "#0B032D" },
        { bg: "#FFF8E1", fg: "#0B032D", button: "#0267C1", secondary: "#0B032D" },
        { bg: "#FFCDD2", fg: "#0B032D", button: "#0267C1", secondary: "#0B032D" },
        { bg: "#DCEDC8", fg: "#0B032D", button: "#0267C1", secondary: "#0B032D" },
        { bg: "#F0F4C3", fg: "#0B032D", button: "#0267C1", secondary: "#0B032D" }
    ];

    const now = new Date();
    const seconds = now.getSeconds();
    let themeIndex;

    if (seconds % 5 === 0) {
        themeIndex = 4;
    } else if (seconds % 7 === 0) {
        themeIndex = 3;
    } else if (seconds % 5 === 0) {
        themeIndex = 2;
    } else if (seconds % 3 === 0) {
        themeIndex = 1;
    } else {
        themeIndex = 0;
    }

    const theme = themes[themeIndex];
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.fg;
    document.querySelector(".container").style.backgroundColor = "white"; /* Always white */
    document.querySelector("h1").style.color = theme.secondary;
    document.querySelectorAll("label").forEach(label => label.style.color = theme.secondary);
    document.querySelectorAll("input, select").forEach(input => input.style.backgroundColor = "#EDEDED");
    document.querySelectorAll("button").forEach(button => {
        button.style.backgroundColor = theme.button;
        button.style.color = "white";
    });
    document.querySelectorAll("#result, .weather-info").forEach(div => {
        div.style.backgroundColor = "#e0f2f1";
        div.style.color = theme.secondary;
    });
    document.querySelectorAll(".credits").forEach(credit => credit.style.color = theme.secondary);
    document.querySelectorAll(".credits a").forEach(a => a.style.color = theme.button);
}