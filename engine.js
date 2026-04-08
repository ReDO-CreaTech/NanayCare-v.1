function isFastBreathing(ageDays, rate) {
  if (!ageDays || !rate) return false;

  if (ageDays < 60) return rate >= 60;
  if (ageDays < 365) return rate >= 50;
  return rate >= 40;
}


function prioritize(r) {
  const order = { RED: 0, YELLOW: 1, GREEN: 2 };
  return r.sort((a, b) => order[a.level] - order[b.level]);
}

function classifyChild(p) {
  let results = [];

  // 🔴 DANGER SIGNS
  const hasDangerSign =
    p.convulsions ||
    p.unableToDrink ||
    p.lethargic ||
    p.vomitsEverything;

    if (hasDangerSign) {
  results.push({
    level: "RED",
    label: "GENERAL DANGER SIGN",
    action: "REFER_URGENT"
  });
}

  // 🥗 SEVERE MALNUTRITION (EDEMA)
    if (p.edemaFeet || p.muacColor === "red") {
      results.push({
        level: "RED",
        label: "SEVERE MALNUTRITION",
        action: "REFER_URGENT"
      });
    }

  // 🫁 COUGH / PNEUMONIA
  if (p.cough) {
    const fast = isFastBreathing(p.ageDays, p.respiratoryRate || 0);

    if (p.chestIndrawing || p.stridor || hasDangerSign) {
      results.push({
        level: "RED",
        label: "SEVERE PNEUMONIA",
        action: "REFER_URGENT"
      });
    } else if (fast) {
      results.push({
        level: "YELLOW",
        label: "PNEUMONIA",
        action: "ANTIBIOTIC_PNEUMONIA"
      });
    } else {
      results.push({
        level: "GREEN",
        label: "NO PNEUMONIA (COUGH/COLD)",
        action: "HOME"
      });
    }

      if (p.wheezing && !hasDangerSign && !p.chestIndrawing) {
          results.push({
          level: "YELLOW",
          label: "WHEEZING (POSSIBLE ASTHMA)",
          action: "BRONCHODILATOR"
        });
      }
  }


  // 💧 DIARRHEA
  if (p.diarrhea) {
    let severeSigns = 0;
    let someSigns = 0;

    if (p.generalCondition === "lethargic") severeSigns++;
    
    if (p.drinking === "poor") severeSigns++;
    if (p.skinPinch === "very_slow") severeSigns++;

    if (p.sunkenEyes) {
        severeSigns++;
        someSigns++;
      }

    if (p.generalCondition === "restless") someSigns++;
    
    if (p.drinking === "thirsty") someSigns++;
    if (p.skinPinch === "slow") someSigns++;

    if (severeSigns >= 2) {
      results.push({ level: "RED", label: "SEVERE DEHYDRATION", action: "IV_REFER" });
    } else if (someSigns >= 2) {
      results.push({ level: "YELLOW", label: "SOME DEHYDRATION", action: "ORS, ZINC" });
    } else {
      results.push({ level: "GREEN", label: "NO DEHYDRATION", action: "HOME" });
    }

    if (p.bloodInStool) {
        results.push({
        level: "YELLOW",
        label: "DYSENTERY",
        action: "ANTIBIOTIC_DYSENTERY"
      });
    }

  }

  // ⏳ PERSISTENT COUGH
  if (p.cough && p.coughDays >= 14) {
    results.push({
      level: "YELLOW",
      label: "PERSISTENT COUGH",
      action: "REFER_URGENT"
    });
  }

  // 🌡️ FEVER / MALARIA

  
const hasMalaria = p.malariaArea && p.rdtResult === "positive";

if (p.fever) {
  if (p.feverDays >= 7) {
    results.push({
      level: "YELLOW",
      label: "PERSISTENT FEVER",
      action: "REFER_URGENT"
    });
  } else if (hasMalaria) {
    results.push({
      level: "YELLOW",
      label: "MALARIA",
      action: "ANTIMALARIAL"
    });
  } else {
    results.push({
      level: "GREEN",
      label: "FEVER (LIKELY VIRAL)",
      action: "HOME"
    });
  }
}

  // 🦠 MEASLES
  if (p.measles) {
    if (p.cornealClouding || p.deepUlcers) {
      results.push({
        level: "RED",
        label: "SEVERE COMPLICATED MEASLES",
        action: "REFER_URGENT"
      });
    } else if (p.eyePus || p.mouthUlcers) {
      results.push({
        level: "YELLOW",
        label: "COMPLICATED MEASLES",
        action: "VITAMIN_A"
      });
    } else {
      results.push({
        level: "GREEN",
        label: "MEASLES",
        action: "HOME"
      });
    }
  }

  // 👂 EAR PROBLEM
  if (p.earProblem) {
    if (p.mastoidTender) {
      results.push({
        level: "RED",
        label: "MASTOIDITIS",
        action: "REFER_URGENT"
      });
    } else if (p.earDischarge && p.earDischargeDays >= 14) {
      results.push({
        level: "YELLOW",
        label: "CHRONIC EAR INFECTION",
        action: "ANTIBIOTIC_EAR"
      });
    } else if (p.earPain || p.earDischarge) {
      results.push({
        level: "YELLOW",
        label: "ACUTE EAR INFECTION",
        action: "ANTIBIOTIC_EAR"
      });
    } else {
      results.push({
        level: "GREEN",
        label: "NO EAR INFECTION",
        action: "HOME"
      });
    }
  }

  // 🥗 NUTRITION (MUAC)
  if (p.edemaFeet || p.muacColor === "red") {
    results.push({
      level: "RED",
      label: "SEVERE MALNUTRITION",
      action: "REFER_URGENT"
    });
  } else if (p.muacColor === "yellow") {
    results.push({
      level: "YELLOW",
      label: "MODERATE MALNUTRITION",
      action: "FEEDING_PROGRAM"
    });
  }

  // 🩸 ANEMIA
  if (p.palmarPallor === "severe") {
    results.push({
      level: "RED",
      label: "SEVERE ANEMIA",
      action: "REFER_URGENT"
    });
  } else if (p.palmarPallor === "some") {
    results.push({
      level: "YELLOW",
      label: "ANEMIA",
      action: "FEEDING_PROGRAM"
    });
  }

  // 🟢 DEFAULT
  if (results.length === 0) {
    results.push({
      level: "GREEN",
      label: "NO CLASSIFICATION",
      action: "HOME"
    });
  }


  // keep only 1 GREEN if there are higher priorities
const hasSerious = results.some(r => r.level !== "GREEN");

if (hasSerious) {
  results = results.filter(r => r.level !== "GREEN");
}

  return prioritize(results);
}



function classifyInfant(p){

  let results = [];

  const fastBreathing = p.respiratoryRate && p.respiratoryRate >= 60;
  const hasFever = p.temperature !== undefined && p.temperature >= 37.5;
  const hasLowTemp = p.temperature !== undefined && p.temperature < 35.5;

  // 🔴 SEVERE BACTERIAL INFECTION
  if (
    p.unableToDrink ||
    p.convulsions ||
    p.lethargic ||
    hasFever ||
    hasLowTemp||
    fastBreathing ||
    p.severeChestIndrawing
  ){
    results.push({
      level:"RED",
      label:"POSSIBLE SERIOUS BACTERIAL INFECTION",
      action:"REFER_URGENT"
    });
  }

  // 🟡 LOCAL INFECTION
  if (
    p.umbilicalRedness ||
    p.skinPustules ||
    p.eyeDischarge
  ){
    results.push({
      level:"YELLOW",
      label:"LOCAL BACTERIAL INFECTION",
      action:"ANTIBIOTIC"
    });
  }

  // 🟡 JAUNDICE
if (p.jaundiceSevere) {
  results.push({
    level:"RED",
    label:"SEVERE JAUNDICE",
    action:"REFER_URGENT"
  });
}

if (p.jaundice) {
  results.push({
    level:"YELLOW",
    label:"JAUNDICE",
    action:"REFER_URGENT"
  });
}

// INFANT DIARRHEA
if (p.diarrhea) {

  let severe = 0;
  let some = 0;

  if (p.infantGeneralCondition === "lethargic") severe++;
  
  if (p.skinPinch === "very_slow") severe++;
  if (p.drinking === "poor") severe++;
  if (p.drinking === "thirsty") some++;

  if (p.sunkenEyes) {
      severe++;
      some++;
    }

  if (p.infantGeneralCondition === "restless") some++;
  
  if (p.skinPinch === "slow") some++;


  if (severe >= 2) {
    results.push({
      level: "RED",
      label: "SEVERE DEHYDRATION",
      action: "REFER_URGENT"
    });

  } else if (some >= 2) {
    results.push({
      level: "YELLOW",
      label: "SOME DEHYDRATION",
      action: "ORS"
    });

  } else {
    results.push({
      level: "GREEN",
      label: "NO DEHYDRATION",
      action: "HOME"
    });
  }

   if (p.bloodInStool) {
      results.push({
        level: "YELLOW",
        label: "DYSENTERY",
        action: "ANTIBIOTIC_DYSENTERY"
      });
    }
}

// FEEDING PROBLEM
if (
  p.feedingDifficulty ||
  p.lowWeight ||
  p.thrush ||
  (p.breastfed && p.feedingFrequency < 8)
) {
  results.push({
    level: "YELLOW",
    label: "FEEDING PROBLEM",
    action: "FEEDING_PROGRAM"
  });
}

// BREASTFEEDING OBSERVATION
if (p.breastfed) {

  if (!p.goodAttachment || !p.effectiveSuckling) {
    results.push({
      level: "YELLOW",
      label: "POOR BREASTFEEDING TECHNIQUE",
      action: "FEEDING_PROGRAM"
    });
  }
}


  // 🟢 NORMAL
  if(results.length === 0){
    results.push({
      level:"GREEN",
      label:"NO INFECTION",
      action:"HOME"
    });
  }

  return prioritize(results);
}