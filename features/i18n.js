const LANG = {
  en: {
    next: "Next",
    yes: "YES",
    no: "NO",
    name: "Name",
    age: "Age (days)",
    weight: "Weight",
    height: "Height",
    temp: "Temperature"
  },
  tl: {
    next: "Susunod",
    yes: "OO",
    no: "HINDI",
    name: "Pangalan",
    age: "Edad (araw)",
    weight: "Timbang",
    height: "Taas",
    temp: "Temperatura"
  }
};

let lang = "tl";

function __(k){ return LANG[lang][k] || k; }