function calcDose({ weight, mgPerKg, maxMgPerDay, dosesPerDay = 2, roundTo = 50 }) {
  if (!weight) return "⚠ Weight required";

  // total daily dose
  let total = mgPerKg * weight;

  // apply max cap
  if (maxMgPerDay && total > maxMgPerDay) {
    total = maxMgPerDay;
  }

    let perDose = total / dosesPerDay;
    perDose = Math.ceil(perDose / roundTo) * roundTo;

    // recompute total safely
    total = perDose * dosesPerDay;

  return {
    total,
    perDose,
    dosesPerDay
  };
}

const treatmentMap = {

  REFER_URGENT: {
    title: { en: "Urgent Referral" },
    steps: [
      { en: "Refer the child immediately to hospital" },
      { en: "Keep the child warm during transport" },
      { en: "If able, give first dose of treatment before referral" }
    ]
  },

  // 🫁 PNEUMONIA
  ANTIBIOTIC_PNEUMONIA: {
    title: { en: "Pneumonia Treatment" },
    drugs: [
      {
        name: "Amoxicillin",
        dose: (p) => {
          const d = calcDose({
            weight: p.weight,
            mgPerKg: 40,
            maxMgPerDay: 2000,
            dosesPerDay: 2,
            roundTo: 50
          });

          if (typeof d === "string") return d;

          return `${d.perDose} mg per dose, ${d.dosesPerDay}x/day`;
        },
        duration: "5 days"
      }
    ],
    advice: [
      { en: "Give first dose immediately" },
      { en: "Return if breathing worsens" }
    ]
  },

  // 💧 DIARRHEA
  ORS: {
    title: { en: "Oral Rehydration Therapy" },
    steps: [
      { en: "Give ORS after each loose stool" },
      { en: "Continue feeding" }
    ],
    dose: (p) => {
      if (!p.weight) return "⚠ Weight required";
      let total = 75 * p.weight;
      total = Math.round(total / 50) * 50;
      return `${total} ml over 4 hours`;
    }
  },

  ZINC: {
    title: { en: "Zinc Supplementation" },
    dose: (p) => {
      if (p.ageDays < 180) return "10 mg once daily for 14 days";
      return "20 mg once daily for 14 days";
    }
  },

  // 🦠 DYSENTERY
  ANTIBIOTIC_DYSENTERY: {
    title: { en: "Dysentery Treatment" },
    drugs: [
      {
        name: "Ciprofloxacin",
        dose: () => `${d.perDose} mg`,
        duration: "3 days"
      }
    ]
  },

  // 🌡️ FEVER
  PARACETAMOL: {
    title: { en: "Fever Management" },
    dose: (p) => {
      if (!p.weight) return "⚠ Weight required";
      const mg = 15 * p.weight;
      return `${Math.round(mg)} mg every 6 hours as needed`;
    }
  },

  // 🦠 MEASLES
  VITAMIN_A: {
    title: { en: "Vitamin A" },
    dose: (p) => {
      if (p.ageDays < 180) return "50,000 IU day 1 & 2";
      if (p.ageDays < 365) return "100,000 IU day 1 & 2";
      return "200,000 IU day 1 & 2";
    }
  },

  // 👂 EAR INFECTION
  ANTIBIOTIC_EAR: {
    title: { en: "Ear Infection Treatment" },
    drugs: [
      {
        name: "Amoxicillin",
        dose: (p) => {
          const d = calcDose({
            weight: p.weight,
            mgPerKg: 40,
            dosesPerDay: 2
          });

          if (typeof d === "string") return d;

          return `${d.perDose} mg per dose, ${d.dosesPerDay}x/day`;
        },
        duration: "5 days"
      }
    ]
  },

  // 🥗 NUTRITION
  FEEDING_PROGRAM: {
    title: { en: "Nutritional Support" },
    steps: [
      { en: "Enroll child in feeding program" },
      { en: "Counsel caregiver on feeding" },
      { en: "Follow up regularly" }
    ]
  },

  HOME: {
    title: { en: "Home Care" },
    steps: [
      { en: "Continue feeding and fluids" },
      { en: "Monitor symptoms" },
      { en: "Return if condition worsens" }
    ]
  }
  

};

// 📘 FROM PDF INTEGRATION
Object.assign(treatmentMap, {

  // 🧑‍⚕️ DRUG ADMINISTRATION (GENERIC)
  ORAL_DRUG_INSTRUCTIONS: {
    title: { en: "How to Give Oral Drugs" },
    steps: [
      { en: "Explain reason for the drug" },
      { en: "Show how to measure the dose" },
      { en: "Watch caregiver practice" },
      { en: "Give first dose in clinic" },
      { en: "Complete full course even if child improves" },
      { en: "Check caregiver understanding" }
    ]
  },

  // 🛡️ HIV PROPHYLAXIS
  COTRIMOXAZOLE_PROPHYLAXIS: {
    title: { en: "Cotrimoxazole Prophylaxis" },
    dose: (p) => {
      if (p.ageDays < 180) return "2.5 ml once daily";
      return "5 ml once daily";
    }
  },

  // 🌬️ WHEEZING
  SALBUTAMOL: {
    title: { en: "Salbutamol for Wheezing" },
    steps: [
      { en: "Use inhaler with spacer" },
      { en: "Give 2 puffs, repeat every 15 min up to 3 times" },
      { en: "Ensure correct breathing technique" }
    ]
  },

  // 🦟 MALARIA
  ANTIMALARIAL_AL: {
    title: { en: "Artemether-Lumefantrine (AL)" },
    steps: [
      { en: "Give first dose in clinic" },
      { en: "Repeat after 8 hours" },
      { en: "Then twice daily for 2 days" },
      { en: "Give with food" }
    ]
  },

  ANTIMALARIAL_ASAQ: {
    title: { en: "Artesunate + Amodiaquine" },
    steps: [
      { en: "Give once daily for 3 days" },
      { en: "Observe first dose for vomiting" }
    ]
  },

  ANTIMALARIAL: {
  title: { en: "Malaria Treatment" },
  steps: [
    { en: "Give Artemether-Lumefantrine (preferred)" },
    { en: "Follow national dosing chart" }
  ]
},

  // 🩸 IRON
  IRON: {
    title: { en: "Iron Supplementation" },
    duration: "14 days",
    dose: (p) => {
      if (!p.weight) return "⚠ Weight required";

      if (p.weight < 6) return "1 ml daily";
      if (p.weight < 10) return "1.25 ml daily";
      if (p.weight < 14) return "2 ml daily or 1/2 tablet";
      return "2.5 ml daily or 1/2 tablet";
    }
  },

  // 👁️ EYE INFECTION
  EYE_TREATMENT: {
    title: { en: "Eye Infection Treatment" },
    steps: [
      { en: "Clean eyes with clean cloth and water" },
      { en: "Apply tetracycline ointment 4 times daily" },
      { en: "Continue until discharge stops" }
    ]
  },

  // 👂 EAR CARE
  EAR_WICKING: {
    title: { en: "Ear Care (Dry Wicking)" },
    steps: [
      { en: "Dry ear with clean wick 3 times daily" },
      { en: "Replace wick when wet" },
      { en: "Use quinolone eardrops after cleaning" }
    ]
  },

  // 👄 MOUTH ULCERS
  MOUTH_ULCER: {
    title: { en: "Mouth Ulcer Treatment" },
    steps: [
      { en: "Clean mouth with salt water" },
      { en: "Apply gentian violet" },
      { en: "Continue 48 hours after healing" }
    ]
  },

  // 🦠 THRUSH
  THRUSH: {
    title: { en: "Thrush Treatment" },
    steps: [
      { en: "Clean mouth with salt water" },
      { en: "Give nystatin 1 ml 4 times daily" },
      { en: "Avoid feeding for 20 minutes after dose" }
    ],
    duration: "7 days"
  },

  // 🍯 COUGH RELIEF
  COUGH_REMEDY: {
    title: { en: "Cough Relief" },
    steps: [
      { en: "Use safe remedies (breast milk for infants)" },
      { en: "Avoid harmful remedies" }
    ]
  },

  // 🥜 MALNUTRITION
  RUTF: {
    title: { en: "Ready-to-Use Therapeutic Food (RUTF)" },
    steps: [
      { en: "Give small frequent feeds" },
      { en: "Continue breastfeeding" },
      { en: "Ensure daily ration is completed" },
      { en: "Offer clean water" }
    ]
  },

  // 🚨 PRE-REFERRAL INJECTION (INFO ONLY)
  IM_ANTIBIOTICS: {
    title: { en: "Pre-referral Antibiotics (Clinic Only)" },
    note: "Ampicillin 50 mg/kg + Gentamicin 7.5 mg/kg",
    steps: [
      { en: "Give before urgent referral" },
      { en: "Repeat if referral delayed" }
    ]
  }

});

// 👶 FROM INFANT PDF INTEGRATION
Object.assign(treatmentMap, {

  // 🚨 VERY SEVERE DISEASE (INFANT)
  IM_ANTIBIOTICS_INFANT: {
    title: { en: "IM Antibiotics for Young Infant" },
    note: "Ampicillin 50 mg/kg + Gentamicin (5 mg/kg if <7 days, 7.5 mg/kg if ≥7 days)",
    steps: [
      { en: "Give first dose immediately before referral" },
      { en: "If referral not possible, continue for at least 5 days" },
      { en: "Ampicillin: 2x/day if <7 days, 3x/day if ≥7 days" },
      { en: "Gentamicin: once daily" }
    ]
  },

  // 🍬 LOW BLOOD SUGAR (INFANT)
  PREVENT_HYPOGLYCEMIA_INFANT: {
    title: { en: "Prevent Low Blood Sugar (Infant)" },
    steps: [
      { en: "Encourage breastfeeding" },
      { en: "If unable: give expressed breast milk" },
      { en: "If not available: give sugar water" },
      { en: "If unable to swallow: give via NG tube" }
    ]
  },

  // 🧣 KEEP WARM
  KEEP_WARM: {
    title: { en: "Keep Infant Warm" },
    steps: [
      { en: "Use skin-to-skin contact" },
      { en: "Cover with warm clothing and blanket" },
      { en: "Include hat, socks, gloves" }
    ]
  },

  // 🦠 LOCAL BACTERIAL INFECTION (INFANT)
  ANTIBIOTIC_LOCAL_INFANT: {
    title: { en: "Local Bacterial Infection (Infant)" },
    drugs: [
      {
        name: "Amoxicillin",
        dose: (p) => {
          if (!p.weight) return "⚠ Weight required";

          if (p.weight < 4) return "2.5 ml twice daily";
          return "5 ml twice daily";
        },
        duration: "5 days"
      }
    ]
  },

  // 🧴 SKIN / UMBILICAL INFECTION
  SKIN_INFECTION: {
    title: { en: "Skin / Umbilical Infection" },
    steps: [
      { en: "Wash hands" },
      { en: "Clean area with soap and water" },
      { en: "Apply gentian violet" },
      { en: "Repeat twice daily for 5 days" }
    ]
  },

  // 👄 THRUSH (INFANT VERSION)
  THRUSH_INFANT: {
    title: { en: "Thrush (Infant)" },
    steps: [
      { en: "Wash hands" },
      { en: "Apply gentian violet to mouth" },
      { en: "Repeat 4 times daily" }
    ],
    duration: "7 days"
  },

  // 🦠 HIV PMTCT
  HIV_PROPHYLAXIS_INFANT: {
    title: { en: "HIV Prophylaxis (Infant)" },
    dose: (p) => {
      if (p.ageDays <= 42) {
        if (p.weight < 2.5) return "Nevirapine 10 mg once daily";
        return "Nevirapine 15 mg once daily";
      }
      return "Nevirapine 20 mg once daily";
    }
  }

});



function getCounselingKeys(patient) {
  let keys = ["GENERAL"];

  if (patient.cough) keys.push("COUGH");
  if (patient.diarrhea) keys.push("DIARRHEA");
  if (patient.fever) keys.push("FEVER");
  if (patient.earProblem) keys.push("EAR");
  if (patient.muacColor === "yellow" || patient.muacColor === "red") {
    keys.push("MALNUTRITION");
  }

  if (patient.diarrhea) keys.push("ORS_COUNSELING");
  if (patient.weight) keys.push("MEDICATION_ADHERENCE");

  return keys;
}

const counselingMap = {

  GENERAL: {
    advice: [
      { en: "Give plenty of fluids" },
      { en: "Continue feeding" }
    ],
    returnSigns: [
      { en: "Unable to drink or breastfeed" },
      { en: "Becomes sicker" },
      { en: "Develops fever" }
    ]
  },

  COUGH: {
    returnSigns: [
      { en: "Fast breathing" },
      { en: "Chest indrawing" },
      { en: "Unable to drink" }
    ],
    followUp: "2 days"
  },

  DIARRHEA: {
    returnSigns: [
      { en: "Drinks poorly" },
      { en: "Becomes lethargic" },
      { en: "Sunken eyes worsen" }
    ],
    followUp: "2 days"
  },

  FEVER: {
    returnSigns: [
      { en: "Fever lasts more than 2 days" },
      { en: "Becomes very sick" }
    ],
    followUp: "2 days"
  },

  EAR: {
    returnSigns: [
      { en: "Swelling behind ear" },
      { en: "Pain worsens" }
    ],
    followUp: "5 days"
  },

  MALNUTRITION: {
    followUp: "14 days"
  }

};

Object.assign(counselingMap, {

  MEDICATION_ADHERENCE: {
    advice: [
      { en: "Complete full course of medication" },
      { en: "Do not stop when child improves" }
    ]
  },

  ORS_COUNSELING: {
    advice: [
      { en: "Give small frequent sips" },
      { en: "Continue feeding" }
    ],
    returnSigns: [
      { en: "Drinks poorly" },
      { en: "Vomiting everything" }
    ]
  }

});