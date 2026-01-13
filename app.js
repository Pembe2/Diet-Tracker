const state = {
  meals: [],
  workouts: [],
};

const STORAGE_KEY = "dietTrackerState";
const USDA_API_KEY = "XL3X3DC2UZ7ldGfrmVk0a4qapfiC16AcXtoL3kqI";
const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

const paletteSelect = document.querySelector("#palette");
const modeToggle = document.querySelector("#modeToggle");
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

const mealForm = document.querySelector("#mealForm");
const mealList = document.querySelector("#mealList");
const mealSearch = document.querySelector("#mealSearch");
const mealSearchBtn = document.querySelector("#mealSearchBtn");
const mealResults = document.querySelector("#mealResults");
const mealUseBtn = document.querySelector("#mealUseBtn");
const mealUnits = document.querySelector("#mealUnits");
const mealLookupStatus = document.querySelector("#mealLookupStatus");
const mealServing = document.querySelector("#mealServing");
const mealSubmit = document.querySelector("#mealSubmit");
const mealCancel = document.querySelector("#mealCancel");
const calorieTotal = document.querySelector("#calorieTotal");
const proteinTotal = document.querySelector("#proteinTotal");
const carbTotal = document.querySelector("#carbTotal");
const fatTotal = document.querySelector("#fatTotal");
const calorieGoal = document.querySelector("#calorieGoal");
const calorieProgress = document.querySelector("#calorieProgress");

const exerciseForm = document.querySelector("#exerciseForm");
const exerciseList = document.querySelector("#exerciseList");
const burnTotal = document.querySelector("#burnTotal");
const sessionTotal = document.querySelector("#sessionTotal");
const minutesTotal = document.querySelector("#minutesTotal");
const burnGoal = document.querySelector("#burnGoal");
const burnProgress = document.querySelector("#burnProgress");
const workoutSubmit = document.querySelector("#workoutSubmit");
const workoutCancel = document.querySelector("#workoutCancel");
const exerciseName = document.querySelector("#exerciseName");
const exerciseMinutes = document.querySelector("#exerciseMinutes");
const exerciseCalories = document.querySelector("#exerciseCalories");
const metToggle = document.querySelector("#metToggle");
const metWeight = document.querySelector("#metWeight");
const metUnit = document.querySelector("#metUnit");
const metIntensity = document.querySelector("#metIntensity");
const metType = document.querySelector("#metType");
const metRpe = document.querySelector("#metRpe");
const metRest = document.querySelector("#metRest");
const metRpeValue = document.querySelector("#metRpeValue");
const metRestValue = document.querySelector("#metRestValue");
const volumeToggle = document.querySelector("#volumeToggle");
const volumeTotal = document.querySelector("#volumeTotal");
const volumeUnit = document.querySelector("#volumeUnit");

const statusLabel = document.querySelector("#statusLabel");
const statusMessage = document.querySelector("#statusMessage");
const statusPill = document.querySelector("#statusPill");
const actionList = document.querySelector("#actionList");
const balanceTotal = document.querySelector("#balanceTotal");
const macroFocus = document.querySelector("#macroFocus");
const consistency = document.querySelector("#consistency");
const resetDay = document.querySelector("#resetDay");
const moodModal = document.querySelector("#moodModal");
const moodSoft = document.querySelector("#moodSoft");
const moodBeast = document.querySelector("#moodBeast");
const moodToggle = document.querySelector("#moodToggle");
const siteSubtitle = document.querySelector("#siteSubtitle");
const siteEyebrow = document.querySelector("#siteEyebrow");

const macroBars = Array.from(document.querySelectorAll("#macroChart .bar"));
const workoutBars = Array.from(document.querySelectorAll("#workoutChart .spark-bar"));

const fmt = (value) => Math.round(value).toString();

let searchTimer = null;
let lastLookupNutrients = null;
let lastLookupUnits = null;
let editingMealId = null;
let editingWorkoutId = null;
let moodChoice = null;

const METS = {
  strength: { light: 3.5, moderate: 5, heavy: 6 },
  hiit: { light: 6, moderate: 8, heavy: 10 },
  circuit: { light: 4, moderate: 6, heavy: 8 },
  yoga: { light: 2.5, moderate: 3.5, heavy: 4.5 },
};

function applyMood(mood) {
  moodChoice = mood;
  document.body.dataset.mood = mood;
  moodToggle.value = mood;
  if (mood === "beast") {
    siteEyebrow.textContent = "Performance tracker";
    siteSubtitle.textContent = "Eat fierce. Lift heavy. Own the day.";
  } else {
    siteEyebrow.textContent = "Daily glow tracker";
    siteSubtitle.textContent = "Eat cute. Move cute. Feel unstoppable.";
  }
}

const promptMoodIfNeeded = () => {
  if (moodChoice) {
    moodModal.classList.add("hidden");
    return;
  }
  moodModal.classList.remove("hidden");
};

const setLookupStatus = (message) => {
  mealLookupStatus.textContent = message;
};

const setUnitsStatus = (message) => {
  mealUnits.textContent = message;
};

const applyServingScale = () => {
  if (!lastLookupNutrients) {
    return;
  }

  const multiplier = Number(mealServing.value) || 1;
  document.querySelector("#mealCalories").value = Math.round(
    lastLookupNutrients.calories * multiplier
  );
  document.querySelector("#mealProtein").value = Math.round(
    lastLookupNutrients.protein * multiplier
  );
  document.querySelector("#mealCarbs").value = Math.round(lastLookupNutrients.carbs * multiplier);
  document.querySelector("#mealFat").value = Math.round(lastLookupNutrients.fat * multiplier);
};

const extractNutrients = (food) => {
  const nutrients = {};
  const units = {};
  if (!food || !Array.isArray(food.foodNutrients)) {
    return { nutrients, units };
  }

  food.foodNutrients.forEach((nutrient) => {
    nutrients[nutrient.nutrientName] = nutrient.value;
    if (nutrient.unitName) {
      units[nutrient.nutrientName] = nutrient.unitName.toLowerCase();
    }
  });

  return {
    nutrients: {
      calories: nutrients["Energy"] || nutrients["Energy (kcal)"] || 0,
      protein: nutrients["Protein"] || 0,
      carbs: nutrients["Carbohydrate, by difference"] || 0,
      fat: nutrients["Total lipid (fat)"] || 0,
    },
    units: {
      calories: units["Energy"] || units["Energy (kcal)"] || "kcal",
      protein: units["Protein"] || "g",
      carbs: units["Carbohydrate, by difference"] || "g",
      fat: units["Total lipid (fat)"] || "g",
    },
  };
};

const searchFoods = async () => {
  const query = mealSearch.value.trim();
  if (!query) {
    setLookupStatus("Type a food to search.");
    return;
  }

  setLookupStatus("Searching USDA...");
  mealResults.innerHTML = "<option value=\"\">Select a result to autofill</option>";

  try {
    const url = new URL(USDA_SEARCH_URL);
    url.searchParams.set("api_key", USDA_API_KEY);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        pageSize: 10,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      setLookupStatus(`USDA lookup failed (${response.status}).`);
      console.error(detail);
      return;
    }

    const data = await response.json();
    if (!data.foods || data.foods.length === 0) {
      setLookupStatus("No matches. Try a different search.");
      return;
    }

    data.foods.forEach((food) => {
      const option = document.createElement("option");
      option.value = food.fdcId;
      option.textContent = `${food.description} (${food.dataType})`;
      const { nutrients, units } = extractNutrients(food);
      option.dataset.food = JSON.stringify({
        name: food.description,
        nutrients,
        units,
      });
      mealResults.appendChild(option);
    });

    setLookupStatus("Pick a result to autofill.");
  } catch (error) {
    setLookupStatus("USDA lookup failed. Check your connection or API key.");
    console.error(error);
  }
};

const useSelectedFood = () => {
  const selected = mealResults.options[mealResults.selectedIndex];
  if (!selected || !selected.dataset.food) {
    setLookupStatus("Select a food first.");
    return;
  }

  const payload = JSON.parse(selected.dataset.food);
  lastLookupNutrients = payload.nutrients;
  lastLookupUnits = payload.units;
  document.querySelector("#mealName").value = payload.name;
  mealServing.value = "1";
  applyServingScale();
  setUnitsStatus(
    `Units: calories ${payload.units.calories}, protein ${payload.units.protein}, carbs ${payload.units.carbs}, fat ${payload.units.fat}`
  );
  setLookupStatus("Autofilled. Edit values if needed, then add meal.");
};

const saveState = () => {
  const snapshot = {
    meals: state.meals,
    workouts: state.workouts,
    calorieGoal: Number(calorieGoal.value) || 0,
    burnGoal: Number(burnGoal.value) || 0,
    metWeight: Number(metWeight.value) || 0,
    metUnit: metUnit.value,
    metType: metType.value,
    metIntensity: metIntensity.value,
    metRpe: Number(metRpe.value) || 6,
    metRest: Number(metRest.value) || 0,
    volumeUnit: volumeUnit.value,
    palette: paletteSelect.value,
    theme: document.body.dataset.theme || "light",
    mood: moodChoice,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
};

const loadState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    document.body.dataset.theme = "light";
    return;
  }

  try {
    const snapshot = JSON.parse(raw);
    state.meals = Array.isArray(snapshot.meals) ? snapshot.meals : [];
    state.workouts = Array.isArray(snapshot.workouts) ? snapshot.workouts : [];
    if (typeof snapshot.calorieGoal === "number") {
      calorieGoal.value = snapshot.calorieGoal || 0;
    }
    if (typeof snapshot.burnGoal === "number") {
      burnGoal.value = snapshot.burnGoal || 0;
    }
    if (typeof snapshot.metWeight === "number" && snapshot.metWeight > 0) {
      metWeight.value = snapshot.metWeight;
    }
    if (snapshot.metUnit) {
      metUnit.value = snapshot.metUnit;
    }
    if (snapshot.metType) {
      metType.value = snapshot.metType;
    }
    if (snapshot.metIntensity) {
      metIntensity.value = snapshot.metIntensity;
    }
    if (typeof snapshot.metRpe === "number") {
      metRpe.value = snapshot.metRpe || 6;
      metRpeValue.textContent = metRpe.value;
    }
    if (typeof snapshot.metRest === "number") {
      metRest.value = snapshot.metRest || 0;
      metRestValue.textContent = `${metRest.value}%`;
    }
    if (snapshot.volumeUnit) {
      volumeUnit.value = snapshot.volumeUnit;
    }
    if (snapshot.palette) {
      paletteSelect.value = snapshot.palette;
    }
    if (snapshot.theme) {
      document.body.dataset.theme = snapshot.theme;
    } else {
      document.body.dataset.theme = "light";
    }
    if (snapshot.mood) {
      applyMood(snapshot.mood);
    }
  } catch (error) {
    document.body.dataset.theme = "light";
  }
};

const updateTheme = () => {
  document.body.dataset.palette = paletteSelect.value;
  saveState();
};

const toggleMode = () => {
  const current = document.body.dataset.theme === "dark";
  document.body.dataset.theme = current ? "light" : "dark";
  modeToggle.textContent = current ? "Dark Mode" : "Light Mode";
  saveState();
};

const setTab = (target) => {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === target);
  });
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === target);
  });
};

const renderMeals = () => {
  mealList.innerHTML = "";
  state.meals.slice().reverse().forEach((meal) => {
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `
      <div>
        <strong>${meal.name}</strong>
        <span>${meal.calories} cal - P ${meal.protein}g - C ${meal.carbs}g - F ${
          meal.fat
        }g - ${meal.servings} serv</span>
      </div>
      <div class="list-actions">
        <button class="list-btn ghost" data-action="edit" data-id="${meal.id}">Edit</button>
        <button class="list-btn" data-action="delete" data-id="${meal.id}">Delete</button>
        <span>${meal.time}</span>
      </div>
    `;
    mealList.appendChild(row);
  });
};

const renderWorkouts = () => {
  exerciseList.innerHTML = "";
  state.workouts.slice().reverse().forEach((workout) => {
    const row = document.createElement("div");
    row.className = "list-item";
    const methodLabel =
      workout.method === "met" ? `METs ${workout.intensity}` : "manual";
    row.innerHTML = `
      <div>
        <strong>${workout.name}</strong>
        <span>${workout.minutes} min - ${workout.calories} cal burned - ${methodLabel}</span>
      </div>
      <div class="list-actions">
        <button class="list-btn ghost" data-action="edit" data-id="${workout.id}">Edit</button>
        <button class="list-btn" data-action="delete" data-id="${workout.id}">Delete</button>
        <span>${workout.time}</span>
      </div>
    `;
    exerciseList.appendChild(row);
  });
};

const updateCharts = (mealTotals) => {
  const macroTotal = mealTotals.protein + mealTotals.carbs + mealTotals.fat;
  const macroValues = [mealTotals.protein, mealTotals.carbs, mealTotals.fat];

  macroBars.forEach((bar, index) => {
    const value = macroTotal ? (macroValues[index] / macroTotal) * 100 : 0;
    const height = Math.max(12, value || 12);
    bar.style.height = `${Math.min(100, height)}%`;
  });

  const recentWorkouts = state.workouts.slice(-7);
  const maxBurn = Math.max(...recentWorkouts.map((workout) => workout.calories), 1);

  workoutBars.forEach((bar, index) => {
    const workout = recentWorkouts[index];
    const ratio = workout ? workout.calories / maxBurn : 0.1;
    bar.style.height = `${Math.max(12, ratio * 100)}%`;
  });
};

const updateTotals = () => {
  const mealTotals = state.meals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories;
      acc.protein += meal.protein;
      acc.carbs += meal.carbs;
      acc.fat += meal.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const workoutTotals = state.workouts.reduce(
    (acc, workout) => {
      acc.calories += workout.calories;
      acc.minutes += workout.minutes;
      acc.sessions += 1;
      return acc;
    },
    { calories: 0, minutes: 0, sessions: 0 }
  );

  calorieTotal.textContent = fmt(mealTotals.calories);
  proteinTotal.textContent = `${fmt(mealTotals.protein)}g`;
  carbTotal.textContent = `${fmt(mealTotals.carbs)}g`;
  fatTotal.textContent = `${fmt(mealTotals.fat)}g`;

  burnTotal.textContent = fmt(workoutTotals.calories);
  minutesTotal.textContent = fmt(workoutTotals.minutes);
  sessionTotal.textContent = fmt(workoutTotals.sessions);

  const goalValue = Number(calorieGoal.value) || 0;
  const burnValue = Number(burnGoal.value) || 0;
  calorieProgress.style.width =
    goalValue === 0 ? "0%" : `${Math.min(100, (mealTotals.calories / goalValue) * 100)}%`;
  burnProgress.style.width =
    burnValue === 0 ? "0%" : `${Math.min(100, (workoutTotals.calories / burnValue) * 100)}%`;

  updateSummary(mealTotals, workoutTotals);
  updateCharts(mealTotals);
  saveState();
};

const updateSummary = (mealTotals, workoutTotals) => {
  const goalValue = Number(calorieGoal.value) || 0;
  const burnValue = Number(burnGoal.value) || 0;
  const net = mealTotals.calories - workoutTotals.calories;
  const remaining = goalValue - mealTotals.calories;
  const proteinShare =
    mealTotals.protein === 0
      ? 0
      : mealTotals.protein / (mealTotals.protein + mealTotals.carbs + mealTotals.fat);

  balanceTotal.textContent = `${fmt(net)} cal`;
  macroFocus.textContent = proteinShare > 0.4 ? "Protein pop" : "Balance boost";
  consistency.textContent = state.workouts.length >= 4 ? "Elite" : "Building";

  let status = "On track";
  let pill = "Balanced";
  let message = "You are aligned with your goal. Keep it radiant.";

  if (goalValue && remaining < -150) {
    status = "Over goal";
    pill = "Adjust";
    message = "You are over your calorie goal. Lighten meals or add a walk.";
  } else if (goalValue && remaining > 250) {
    status = "Under goal";
    pill = "Nourish";
    message = "You are under your goal. Add something satisfying and protein rich.";
  }

  statusLabel.textContent = status;
  statusPill.textContent = pill;
  statusMessage.textContent = message;

  const actions = [];
  if (proteinShare < 0.3) {
    actions.push("Add a protein snack (Greek yogurt, tofu bowl, or shake).");
  }
  if (remaining > 200) {
    actions.push("Plan a glam snack: fruit + nut butter.");
  }
  if (remaining < -100) {
    actions.push("Swap to lighter dinner: salad + lean protein.");
  }
  if (burnValue && workoutTotals.calories < burnValue * 0.5) {
    actions.push("Schedule a 20 min flow workout tonight.");
  }
  if (actions.length === 0) {
    actions.push("Hydrate and stretch. You are glowing.");
  }

  actionList.innerHTML = actions.map((action) => `<li>${action}</li>`).join("");
};

const resetMealForm = () => {
  mealForm.reset();
  mealServing.value = "1";
  editingMealId = null;
  lastLookupNutrients = null;
  lastLookupUnits = null;
  setUnitsStatus("");
  mealSubmit.textContent = "Add meal";
  mealCancel.classList.add("hidden");
};

const ensureMealIds = () => {
  state.meals = state.meals.map((meal) => ({
    ...meal,
    id: meal.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    servings: meal.servings || 1,
  }));
};

const resetWorkoutForm = () => {
  exerciseForm.reset();
  editingWorkoutId = null;
  workoutSubmit.textContent = "Log workout";
  workoutCancel.classList.add("hidden");
  metToggle.checked = false;
  metWeight.value = "";
  metUnit.value = "lb";
  metIntensity.value = "moderate";
  metType.value = "strength";
  metRpe.value = "6";
  metRest.value = "20";
  metRpeValue.textContent = "6";
  metRestValue.textContent = "20%";
  volumeToggle.checked = false;
  volumeTotal.value = "";
  volumeUnit.value = "lb";
  updateMetCalories();
};

const ensureWorkoutIds = () => {
  state.workouts = state.workouts.map((workout) => ({
    ...workout,
    id: workout.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  }));
};

const getWeightKg = () => {
  const raw = Number(metWeight.value);
  if (!raw) {
    return 0;
  }
  return metUnit.value === "lb" ? raw * 0.45359237 : raw;
};

const updateMetCalories = () => {
  if (!metToggle.checked) {
    exerciseCalories.disabled = false;
    exerciseCalories.required = true;
    exerciseCalories.placeholder = "Calories burned";
    return;
  }
  exerciseCalories.disabled = true;
  exerciseCalories.required = false;
  const minutes = Number(exerciseMinutes.value) || 0;
  const weightKg = getWeightKg();
  const type = metType.value || "strength";
  const met = (METS[type] && METS[type][metIntensity.value]) || METS.strength.moderate;
  if (!minutes || !weightKg) {
    exerciseCalories.placeholder = "Calories (auto when ready)";
    exerciseCalories.value = "";
    return;
  }
  const rpe = Number(metRpe.value) || 6;
  const rest = Number(metRest.value) || 0;
  const rpeFactor = 1 + (rpe - 5) * 0.05;
  const restFactor = Math.max(0.4, 1 - rest / 100);
  let calories = (met * 3.5 * weightKg * minutes * rpeFactor * restFactor) / 200;
  if (volumeToggle.checked && Number(volumeTotal.value) > 0 && minutes > 0) {
    const volume = Number(volumeTotal.value);
    const volumeKg = volumeUnit.value === "lb" ? volume * 0.45359237 : volume;
    const density = volumeKg / minutes;
    const modifier = Math.min(0.15, Math.max(0, (density - 5) / 100));
    calories *= 1 + modifier;
  }
  exerciseCalories.value = Math.round(calories);
};

const updateMetLabels = () => {
  metRpeValue.textContent = metRpe.value;
  metRestValue.textContent = `${metRest.value}%`;
};

mealForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const meal = {
    name: document.querySelector("#mealName").value.trim(),
    calories: Number(document.querySelector("#mealCalories").value),
    protein: Number(document.querySelector("#mealProtein").value),
    carbs: Number(document.querySelector("#mealCarbs").value),
    fat: Number(document.querySelector("#mealFat").value),
    servings: Number(mealServing.value) || 1,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  if (!meal.name) {
    return;
  }

  if (editingMealId) {
    state.meals = state.meals.map((item) =>
      item.id === editingMealId ? { ...item, ...meal } : item
    );
  } else {
    meal.id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    state.meals.push(meal);
  }
  resetMealForm();
  renderMeals();
  updateTotals();
});

exerciseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const useMet = metToggle.checked;
  if (useMet) {
    updateMetCalories();
  }
  const workout = {
    name: exerciseName.value.trim(),
    minutes: Number(exerciseMinutes.value),
    calories: Number(exerciseCalories.value),
    method: useMet ? "met" : "manual",
    intensity: useMet ? metIntensity.value : null,
    metType: useMet ? metType.value : null,
    rpe: useMet ? Number(metRpe.value) || 6 : null,
    rest: useMet ? Number(metRest.value) || 0 : null,
    volume: useMet && volumeToggle.checked ? Number(volumeTotal.value) || 0 : null,
    volumeUnit: useMet && volumeToggle.checked ? volumeUnit.value : null,
    weight: useMet ? Number(metWeight.value) || 0 : null,
    weightUnit: useMet ? metUnit.value : null,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  if (!workout.name) {
    return;
  }

  if (editingWorkoutId) {
    state.workouts = state.workouts.map((item) =>
      item.id === editingWorkoutId ? { ...item, ...workout } : item
    );
  } else {
    workout.id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    state.workouts.push(workout);
  }
  resetWorkoutForm();
  renderWorkouts();
  updateTotals();
});

paletteSelect.addEventListener("change", () => {
  updateTheme();
});

modeToggle.addEventListener("click", toggleMode);
mealSearchBtn.addEventListener("click", searchFoods);
mealUseBtn.addEventListener("click", useSelectedFood);
mealSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchFoods();
  }
});
mealSearch.addEventListener("input", () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  searchTimer = setTimeout(() => {
    searchFoods();
  }, 500);
});
mealServing.addEventListener("input", applyServingScale);
["#mealCalories", "#mealProtein", "#mealCarbs", "#mealFat"].forEach((selector) => {
  const field = document.querySelector(selector);
  field.addEventListener("input", () => {
    lastLookupNutrients = null;
    lastLookupUnits = null;
    setUnitsStatus("");
  });
});

  metToggle.addEventListener("change", updateMetCalories);
metWeight.addEventListener("input", updateMetCalories);
metUnit.addEventListener("change", updateMetCalories);
metIntensity.addEventListener("change", updateMetCalories);
metType.addEventListener("change", updateMetCalories);
metRpe.addEventListener("input", () => {
  updateMetLabels();
  updateMetCalories();
});
metRest.addEventListener("input", () => {
  updateMetLabels();
  updateMetCalories();
});
exerciseMinutes.addEventListener("input", updateMetCalories);
metWeight.addEventListener("change", saveState);
metUnit.addEventListener("change", saveState);
metType.addEventListener("change", saveState);
metIntensity.addEventListener("change", saveState);
metRpe.addEventListener("change", saveState);
metRest.addEventListener("change", saveState);
volumeToggle.addEventListener("change", updateMetCalories);
volumeTotal.addEventListener("input", updateMetCalories);
volumeUnit.addEventListener("change", updateMetCalories);
volumeToggle.addEventListener("change", saveState);
volumeUnit.addEventListener("change", saveState);
moodSoft.addEventListener("click", () => {
  applyMood("soft");
  saveState();
  moodModal.classList.add("hidden");
});
moodBeast.addEventListener("click", () => {
  applyMood("beast");
  saveState();
  moodModal.classList.add("hidden");
});
moodToggle.addEventListener("change", () => {
  applyMood(moodToggle.value);
  saveState();
});

mealCancel.addEventListener("click", () => {
  resetMealForm();
});

mealList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const id = button.dataset.id;
  if (!action || !id) {
    return;
  }

  if (action === "delete") {
    state.meals = state.meals.filter((meal) => meal.id !== id);
    renderMeals();
    updateTotals();
    return;
  }

  if (action === "edit") {
    const meal = state.meals.find((item) => item.id === id);
    if (!meal) {
      return;
    }
    editingMealId = id;
    document.querySelector("#mealName").value = meal.name;
    document.querySelector("#mealCalories").value = meal.calories;
    document.querySelector("#mealProtein").value = meal.protein;
    document.querySelector("#mealCarbs").value = meal.carbs;
    document.querySelector("#mealFat").value = meal.fat;
    mealServing.value = meal.servings || 1;
    lastLookupNutrients = null;
    lastLookupUnits = null;
    setUnitsStatus("Editing meal values (manual).");
    mealSubmit.textContent = "Update meal";
    mealCancel.classList.remove("hidden");
  }
});

workoutCancel.addEventListener("click", () => {
  resetWorkoutForm();
});

exerciseList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const id = button.dataset.id;
  if (!action || !id) {
    return;
  }

  if (action === "delete") {
    state.workouts = state.workouts.filter((workout) => workout.id !== id);
    renderWorkouts();
    updateTotals();
    return;
  }

  if (action === "edit") {
    const workout = state.workouts.find((item) => item.id === id);
    if (!workout) {
      return;
    }
    editingWorkoutId = id;
    exerciseName.value = workout.name;
    exerciseMinutes.value = workout.minutes;
    exerciseCalories.value = workout.calories;
    metToggle.checked = workout.method === "met";
    metWeight.value = workout.weight || "";
    metUnit.value = workout.weightUnit || "lb";
    metIntensity.value = workout.intensity || "moderate";
    metType.value = workout.metType || "strength";
    metRpe.value = workout.rpe || 6;
    metRest.value = workout.rest || 20;
    metRpeValue.textContent = metRpe.value;
    metRestValue.textContent = `${metRest.value}%`;
    volumeToggle.checked = Boolean(workout.volume);
    volumeTotal.value = workout.volume || "";
    volumeUnit.value = workout.volumeUnit || "lb";
    workoutSubmit.textContent = "Update workout";
    workoutCancel.classList.remove("hidden");
  }
});

calorieGoal.addEventListener("input", updateTotals);
burnGoal.addEventListener("input", updateTotals);

resetDay.addEventListener("click", () => {
  state.meals = [];
  state.workouts = [];
  renderMeals();
  renderWorkouts();
  updateTotals();
  setTab("meals");
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setTab(tab.dataset.tab));
});

loadState();
ensureMealIds();
ensureWorkoutIds();
modeToggle.textContent = document.body.dataset.theme === "dark" ? "Light Mode" : "Dark Mode";
updateTheme();
renderMeals();
renderWorkouts();
updateTotals();
updateMetLabels();
updateMetCalories();
promptMoodIfNeeded();
