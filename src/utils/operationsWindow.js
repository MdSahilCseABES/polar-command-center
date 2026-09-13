/**
 * OPERATIONS SAFETY WINDOW CALCULATOR
 * Evaluates flight sorties, overland traverses, and exterior station science limits.
 */

export function calculateOperationsWindow(
  temp,
  apparentTemp,
  windSpeed,
  windGusts,
  visibility,
  weatherCode,
  precip
) {
  let flightSafety = 'OPTIMAL'
  let traverseSafety = 'OPEN'
  let exteriorWork = 'PERMITTED'
  let overall = 'GO'

  // Wind Chill assessment
  let windChillSeverity = 'MILD'
  if (apparentTemp < -45) {
    windChillSeverity = 'EXTREME'
  } else if (apparentTemp < -30) {
    windChillSeverity = 'SEVERE'
  } else if (apparentTemp < -15) {
    windChillSeverity = 'MODERATE'
  }

  const isBlizzard = weatherCode === 75 || weatherCode === 86
  const isSevereWeather = weatherCode >= 95 || isBlizzard
  const isFog = weatherCode === 45 || weatherCode === 48 || (visibility !== null && visibility < 1000)

  // Flight operations assessment (fixed-wing Twin Otter / helicopters)
  if (windGusts > 65 || windSpeed > 45 || isSevereWeather || (visibility !== null && visibility < 800)) {
    flightSafety = 'RESTRICTED'
  } else if (windGusts > 45 || windSpeed > 30 || isFog || (visibility !== null && visibility < 3000)) {
    flightSafety = 'MARGINAL'
  }

  // Overland Traverse (PistenBully / snowmobiles / sledge convoys)
  if (windGusts > 75 || isBlizzard || (visibility !== null && visibility < 400)) {
    traverseSafety = 'HAZARDOUS'
  } else if (windGusts > 50 || isFog || precip > 5) {
    traverseSafety = 'CAUTION'
  }

  // Exterior Research & Station Work
  if (apparentTemp < -45 || windGusts > 75 || isSevereWeather) {
    exteriorWork = 'SUSPENDED'
  } else if (apparentTemp < -25 || windGusts > 45 || precip > 3) {
    exteriorWork = 'LIMITED'
  }

  // Overall status
  if (flightSafety === 'RESTRICTED' || traverseSafety === 'HAZARDOUS' || exteriorWork === 'SUSPENDED') {
    overall = 'NO_GO'
  } else if (flightSafety === 'MARGINAL' || traverseSafety === 'CAUTION' || exteriorWork === 'LIMITED') {
    overall = 'CAUTION'
  } else {
    overall = 'GO'
  }

  // Advisory text
  let advisory = 'Normal operational parameters. Exterior science activities and flight movements supported.'
  if (overall === 'NO_GO') {
    if (isBlizzard || isSevereWeather) {
      advisory = 'BLIZZARD PROTOCOL ACTIVE: Ground all exterior movements. Maintain radio check-in schedules.'
    } else if (apparentTemp < -45) {
      advisory = 'CRITICAL FROSTBITE RISK: Extreme wind chill index. Mandatory buddy system and shelter-in-place.'
    } else if (windGusts > 70) {
      advisory = 'GALE FORCE GUSTS: Overland traverses halted. Secure loose cargo and station exterior hatches.'
    } else {
      advisory = 'RESTRICTED WINDOW: Low visibility / adverse conditions exceed safe threshold limits.'
    }
  } else if (overall === 'CAUTION') {
    if (windGusts > 45) {
      advisory = 'WIND ADVISORY: High gusts recorded. Twin Otter flights subject to captain discretion.'
    } else if (isFog) {
      advisory = 'LOW VISIBILITY CAUTION: Visual navigation impaired. GPS waypoint tracking required for traverse.'
    } else {
      advisory = 'MARGINAL WINDOW: Sub-zero conditions. Limit unaccompanied exterior exposure to 30 minutes.'
    }
  }

  return {
    overall,
    flightSafety,
    traverseSafety,
    exteriorWork,
    advisory,
    windChillSeverity,
  }
}
