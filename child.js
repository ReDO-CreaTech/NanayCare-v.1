const childFlow = [

  // 🔴 DANGER SIGNS
  { id:"unableToDrink", type:"boolean", label:{en:"Cannot drink or feed?", tl:"Hindi makainom o makakain?"}},
  { id:"vomitsEverything", type:"boolean", label:{en:"Vomits everything?", tl:"Isinusuka lahat?"}},
  { id:"convulsions", type:"boolean", label:{en:"Convulsions?", tl:"May kombulsyon?"}},
  { id:"lethargic", type:"boolean", label:{en:"Unusually sleepy or unconscious?", tl:"Matamlay o walang malay?"}},

  // 🫁 COUGH / BREATHING
  { id:"cough", type:"boolean", label:{en:"Cough?", tl:"May ubo?"}},
  { id:"coughDays", type:"number", label:{en:"Cough for how many days?", tl:"Ilang araw ang ubo?"}, when: (p) => p.cough },
  { id:"respiratoryRate", type:"number", label:{en:"Breaths per minute (Use the Green Button below, Place your phone near child's chest for 15sec.)", tl:"Paghinga kada minuto"}, when: (p) => p.cough },
//   {
//   id: "respiratoryRate",
//   type: "breathingTool",
//   when: (p) => p.cough
// },
  { id:"chestIndrawing", type:"boolean", label:{en:"Chest indrawing?", tl:"Lumiliit ang dibdib?"}, when: (p) => p.cough },
  { id:"stridor", type:"boolean", label:{en:"Stridor (noisy breathing)?"}, when:(p)=>p.cough },
  { id:"wheezing", type:"boolean", label:{en:"Wheezing?"}, when:(p)=>p.cough },

  // 💧 DIARRHEA
  { id:"diarrhea", type:"boolean", label:{en:"Diarrhea?", tl:"May pagtatae?"}},
  { id:"diarrheaDays", type:"number", label:{en:"Diarrhea for how many days?", tl:"Ilang araw ang pagtatae?"}, when: (p) => p.diarrhea === true},
  { id:"bloodInStool", type:"boolean", label:{en:"Blood in stool?", tl:"May dugo sa dumi?"}, when: (p) => p.diarrhea === true},
  { id:"generalCondition",  type:"select",  label:{en:"General condition"},  options:[{value:"normal", label:"Normal"}, {value:"restless", label:"Restless / irritable"}, {value:"lethargic", label:"Lethargic / unconscious"}], when:(p)=>p.diarrhea},
  { id:"sunkenEyes", type:"boolean", label:{en:"Sunken eyes?"}, when:(p)=>p.diarrhea },
  { id:"drinking", type:"select", label:{en:"Drinking behavior"}, options:[{value:"normal", label:"Normal"}, {value:"thirsty", label:"Drinks eagerly / thirsty"}, {value:"poor", label:"Not able to drink / drinking poorly"} ], when:(p)=>p.diarrhea},
  { id:"skinPinch", type:"select", label:{en:"Skin pinch result", tl:"Balik ng balat"}, options:[ {value:"normal", label:"Normal"}, {value:"slow", label:"Slow"}, {value:"very_slow", label:"Very slow"} ], when:(p)=>p.diarrhea },


  // 🌡️ FEVER
  { id:"fever", type:"boolean", label:{en:"Fever (now or recent)?", tl:"May lagnat?"}},

    // TEMPERATURE
  { id:"temperature", type:"number", label:{en:"Measure temperature (°C)"}},
  { id:"feelsHot", type:"boolean", label:{en:"Does the infant feel hot?"}, when: (p) => !p.temperature},
 
 
  { id:"feverDays", type:"number", label:{en:"Fever for how many days?", tl:"Ilang araw ang lagnat?"}, when: (p) => p.fever === true},
  { id:"malariaArea", type:"boolean", label:{en:"Living in malaria area?", tl:"Nasa malaria area?"}, when: (p) => p.fever === true},
  {
    id:"rdtResult",
    type:"select",
    label:{en:"Malaria test result", tl:"Resulta ng malaria test"},
    options:[
      {value:"positive", label:"Positive"},
      {value:"negative", label:"Negative"}
    ],
    when: (p) => p.fever === true && p.malariaArea === true
  },


    // MEASLES
  { id:"measles", type:"boolean", label:{en:"Has measles (rash with cough/runny nose/red eyes)?"}, when:(p)=>p.fever },
  { id:"mouthUlcers", type:"boolean", label:{en:"Mouth ulcers?"}, when:(p)=>p.measles },
  { id:"deepUlcers", type:"boolean", label:{en:"Deep or extensive ulcers?"}, when:(p)=>p.measles },
  { id:"eyePus", type:"boolean", label:{en:"Pus draining from eye?"}, when:(p)=>p.measles },
  { id:"cornealClouding", type:"boolean", label:{en:"Clouding of cornea?"}, when:(p)=>p.measles },


  // EAR PROBLEM
{ id:"earProblem", type:"boolean", label:{en:"Ear problem?", tl:"May problema sa tenga?"}},
{ id:"earPain", type:"boolean", label:{en:"Ear pain?", tl:"Masakit ang tenga?"}, when: (p)=>p.earProblem },
{ id:"earDischarge", type:"boolean", label:{en:"Ear discharge?", tl:"May lumalabas sa tenga?"}, when: (p)=>p.earProblem },
{ id:"earDischargeDays", type:"number", label:{en:"Discharge for how many days?"}, when: (p)=>p.earDischarge },
{ id:"mastoidTender", type:"boolean", label:{en:"Tender swelling behind ear?"}, when: (p)=>p.earProblem },


    // 🥗 NUTRITION (MUAC)
  {
    id:"muacColor",
    type:"select",
    label:{en:"MUAC color", tl:"Kulay ng MUAC"},
    options:[
      {value:"green", label:"Green"},
      {value:"yellow", label:"Yellow"},
      {value:"red", label:"Red"}
    ]
  },

  { id:"edemaFeet", type:"boolean", label:{en:"Swelling of both feet?", tl:"Pamamaga ng dalawang paa?"}},


  // ANEMIA
{ 
  id:"palmarPallor", type:"select", label:{en:"Palmar pallor"}, options:[{value:"none", label:"None"},{value:"some", label:"Some"},{value:"severe", label:"Severe"}]},

];