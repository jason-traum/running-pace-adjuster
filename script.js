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

function calculatePaceAdjustment(goalPace, temp, humidity, hydrationStatus, acclimatization, workoutLength) {
const dewPoint = calculateDewPoint(temp, humidity);
let adjustment = getBaseAdjustment(temp, dewPoint);

// Adjust for hydration status: increase adjustment if dehydrated
if (hydrationStatus === 'dehydrated') {
    adjustment *= 1.10; // Adding a 10% increase if dehydrated
}

// Adjust for acclimatization: reduce adjustment based on acclimatization level
if (acclimatization > 0) {
    adjustment *= 1 - (acclimatization * 0.01); // Reduce adjustment by 1% per hour of acclimatization
}

// Adjust for workout length: increase adjustment for longer workouts
if (workoutLength > 60) {
    adjustment *= 1 + ((workoutLength - 60) * 0.005); // Increase adjustment by 0.5% for each minute over 60 minutes
}

// Split goal pace into minutes and seconds
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
const goalPace = document.getElementById(‘goalPace’).value;
const expectedTime = document.getElementById(‘expectedTime’).value;
const location = document.getElementById(‘location’).value;
const date = document.getElementById(‘date’).value;
const hydrationStatus = document.getElementById(‘hydrationStatus’).value;
const acclimatization = parseInt(document.getElementById(‘acclimatization’).value);
const workoutLength = parseInt(document.getElementById(‘workoutLength’).value);

try {
    const { temp, humidity, condition } = await fetchWeatherData(location, date);
    const dewPoint = calculateDewPoint(temp, humidity);
    const adjustedPace = calculatePaceAdjustment(goalPace, temp, humidity, hydrationStatus, acclimatization, workoutLength);

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

// Set current date as default value
document.getElementById(‘date’).value = new Date().toISOString().substring(0, 10);

function applyTheme() {
const themes = [
{ bg: ‘#E0F7FA’, fg: ‘#0B032D’, button: ‘#D88C9A’, secondary: ‘#0B032D’ },
{ bg: ‘#FFF8E1’, fg: ‘#0B032D’, button: ‘#0267C1’, secondary: ‘#0B032D’ },
{ bg: ‘#FFCDD2’, fg: ‘#0B032D’, button: ‘#0267C1’, secondary: ‘#0B032D’ },
{ bg: ‘#DCEDC8’, fg: ‘#0B032D’, button: ‘#0267C1’, secondary: ‘#0B032D’ },
{ bg: ‘#F0F4C3’, fg: ‘#0B032D’, button: ‘#0267C1’, secondary: ‘#0B032D’ }
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
document.querySelector('.container').style.backgroundColor = 'white'; /* Always white */
document.querySelector('h1').style.color = theme.secondary;
document.querySelectorAll('label').forEach(label => label.style.color = theme.secondary);
document.querySelectorAll('input, select').forEach(input => input.style.backgroundColor = '#EDEDED');
document.querySelectorAll('button').forEach(button => {
    button.style.backgroundColor = theme.button;
    button.style.color = 'white';
});
document.querySelectorAll('#result, .weather-info').forEach(div => {
    div.style.backgroundColor = '#e0f2f1';
    div.style.color = theme.secondary;
});
document.querySelectorAll('.credits').forEach(credit => credit.style.color = theme.secondary);
document.querySelectorAll('.credits a').forEach(a => a.style.color = theme.button);

}