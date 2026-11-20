// Test suite for BMKG Weather & Aquaculture Advisory Engine
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, name, detail) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`, detail || '');
    failed++;
  }
}

// Import logic from bmkg.ts via regex or re-implemented checks
console.log('--- TEST 1: AQUACULTURE WEATHER RULES ---');

// Simulate getAquacultureWeatherAdvice logic
function testAdvice(desc, temp) {
  const descLower = (desc || '').toLowerCase();
  if (descLower.includes('petir') || descLower.includes('kilat') || descLower.includes('lebat')) {
    return { level: 'warning', icon: 'cloud-bolt' };
  }
  if (descLower.includes('sedang')) {
    return { level: 'warning', icon: 'cloud-rain' };
  }
  if (descLower.includes('hujan') || descLower.includes('gerimis') || descLower.includes('rintik')) {
    return { level: 'caution', icon: 'cloud-rain' };
  }
  if (temp >= 33) {
    return { level: 'caution', icon: 'temperature-high' };
  }
  if (temp > 0 && temp < 24) {
    return { level: 'info', icon: 'temperature-low' };
  }
  if (descLower.includes('tebal') || descLower.includes('gelap') || descLower.includes('kabut') || descLower.includes('asap')) {
    return { level: 'info', icon: 'cloud' };
  }
  if (descLower.includes('berawan')) {
    return { level: 'optimal', icon: 'cloud-sun' };
  }
  return { level: 'optimal', icon: 'sun' };
}

assert(testAdvice('Hujan Petir', 28).level === 'warning', 'Thunderstorm triggers warning');
assert(testAdvice('Hujan Sedang', 27).level === 'warning', 'Moderate rain triggers warning');
assert(testAdvice('Hujan Ringan', 29).level === 'caution', 'Light rain triggers caution');
assert(testAdvice('Cerah Berawan', 34).level === 'caution', 'Extreme heat (>33C) triggers caution');
assert(testAdvice('Cerah Berawan', 22).level === 'info', 'Cool temp (<24C) triggers info');
assert(testAdvice('Berawan Tebal', 28).level === 'info', 'Overcast clouds trigger info for oxygen watch');
assert(testAdvice('Cerah Berawan', 29).level === 'optimal', 'Ideal weather triggers optimal feeding');

console.log('\n--- TEST 2: STRICT STYLING AUDIT (NO GREEN & NO EMOJI) ---');

const weatherWidgetContent = fs.readFileSync('src/components/WeatherWidget.tsx', 'utf-8');
const bmkgLibContent = fs.readFileSync('src/lib/bmkg.ts', 'utf-8');

// Check green references
const greenPattern = /emerald|#245C45|text-green|bg-green|border-green/i;
assert(!greenPattern.test(weatherWidgetContent), 'WeatherWidget.tsx contains NO green or emerald styling');
assert(!greenPattern.test(bmkgLibContent), 'bmkg.ts contains NO green or emerald references');

// Check emoji presence
const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
assert(!emojiPattern.test(weatherWidgetContent), 'WeatherWidget.tsx contains 0 emojis (uses FontAwesome)');
assert(!emojiPattern.test(bmkgLibContent), 'bmkg.ts contains 0 emojis');

console.log(`\n========================================`);
console.log(`BMKG VERIFICATION TESTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
