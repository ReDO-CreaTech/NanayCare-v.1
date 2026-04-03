const infantFlow = [

  // DANGER SIGNS
  { id:"unableToDrink", type:"boolean", label:{en:"Not able to drink or breastfeed"}},
  { id:"convulsions", type:"boolean", label:{en:"Convulsions?"}},
  { id:"lethargic", type:"boolean", label:{en:"Movement only when stimulated?"}},

  // TEMPERATURE
  { id:"temperature", type:"number", label:{en:"Measure temperature (°C)"}},
  { id:"feelsHot", type:"boolean", label:{en:"Does the infant feel hot?"}, when: (p) => !p.temperature},

  // BREATHING
  { id:"respiratoryRate", type:"number", label:{en:"Breaths per minute (Use the Green Button below, Place your phone near baby's chest for 15sec.)"}},
  { id:"severeChestIndrawing", type:"boolean", label:{en:"Severe chest indrawing?"}},

  // LOCAL INFECTIONS
  { id:"umbilicalRedness", type:"boolean", label:{en:"Redness or pus around umbilicus?"}},
  { id:"skinPustules", type:"boolean", label:{en:"Many or severe skin pustules?"}},
  { id:"eyeDischarge", type:"boolean", label:{en:"Eye discharge?"}},

  // JAUNDICE
  { id:"jaundice", type:"boolean", label:{en:"Yellow palms/soles?", tl:"Dilaw ang palad/talampakan?"}},
  { id:"jaundiceSevere", type:"boolean", label:{en:"Yellow palms or soles?"}, when:(p)=>p.jaundice },


  // DIARRHEA
{ id:"diarrhea", type:"boolean", label:{en:"Does the infant have diarrhea?"}},

{ 
  id:"infantGeneralCondition", 
  type:"select", 
  label:{en:"General condition"}, 
  options:[
    {value:"normal", label:"Normal"},
    {value:"restless", label:"Restless / irritable"},
    {value:"lethargic", label:"Lethargic / unconscious"}
  ],
  when:(p)=>p.diarrhea
},

{ id:"sunkenEyes", type:"boolean", label:{en:"Sunken eyes?"}, 
  when:(p)=>p.diarrhea },

{ 
  id:"skinPinch", 
  type:"select", 
  label:{en:"Skin pinch result"}, 
  options:[
    {value:"normal", label:"Normal"},
    {value:"slow", label:"Slow"},
    {value:"very_slow", label:"Very slow"}
  ],
  when:(p)=>p.diarrhea
},

// FEEDING PROBLEM
{ id:"feedingDifficulty", type:"boolean", label:{en:"Any difficulty feeding?"}},

{ id:"breastfed", type:"boolean", label:{en:"Is the infant breastfed?"}},

{ id:"feedingFrequency", type:"number", label:{en:"Feeds per 24 hours"}, 
  when:(p)=>p.breastfed },

{ id:"otherFoods", type:"boolean", label:{en:"Other foods or drinks given?"}},

{ id:"feedingMethod", type:"select", label:{en:"Feeding method"}, 
  options:[
    {value:"cup", label:"Cup"},
    {value:"bottle", label:"Bottle"},
    {value:"spoon", label:"Spoon"}
  ],
  when:(p)=>p.otherFoods
},

{ id:"lowWeight", type:"boolean", label:{en:"Low weight for age?"}},

{ id:"thrush", type:"boolean", label:{en:"White patches in mouth (thrush)?"}},

// BREASTFEEDING OBSERVATION
{ id:"breastfedLastHour", type:"boolean", label:{en:"Breastfed in the last hour?"}, when:(p)=>p.feedingDifficulty || p.lowWeight},

{ id:"goodAttachment", type:"boolean", label:{en:"Good attachment?"}, when:(p)=>p.feedingDifficulty || p.lowWeight},

{ id:"effectiveSuckling", type:"boolean", label:{en:"Sucking effectively?"}, when:(p)=>p.feedingDifficulty || p.lowWeight},

];