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
const mealLookupStatus = document.querySelector("#mealLookupStatus");
const mealServing = document.querySelector("#mealServing");
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

const statusLabel = document.querySelector("#statusLabel");
const statusMessage = document.querySelector("#statusMessage");
const statusPill = document.querySelector("#statusPill");
const actionList = document.querySelector("#actionList");
const balanceTotal = document.querySelector("#balanceTotal");
const macroFocus = document.querySelector("#macroFocus");
const consistency = document.querySelector("#consistency");
const resetDay = document.querySelector("#resetDay");

const macroBars = Array.from(document.querySelectorAll("#macroChart .bar"));
const workoutBars = Array.from(document.querySelectorAll("#workoutChart .spark-bar"));

const fmt = (value) => Math.round(value).toString();

let searchTimer = null;
let lastLookupNutrients = null;

const setLookupStatus = (message) => {
  mealLookupStatus.textContent = message;
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
  if (!food || !Array.isArray(food.foodNutrients)) {
    return nutrients;
  }

  food.foodNutrients.forEach((nutrient) => {
    nutrients[nutrient.nutrientName] = nutrient.value;
  });

  return {
    calories: nutrients["Energy"] || nutrients["Energy (kcal)"] || 0,
    protein: nutrients["Protein"] || 0,
    carbs: nutrients["Carbohydrate, by difference"] || 0,
    fat: nutrients["Total lipid (fat)"] || 0,
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
      option.dataset.food = JSON.stringify({
        name: food.description,
        nutrients: extractNutrients(food),
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
  document.querySelector("#mealName").value = payload.name;
  mealServing.value = "1";
  applyServingScale();
  setLookupStatus("Autofilled. Edit values if needed, then add meal.");
};

const saveState = () => {
  const snapshot = {
    meals: state.meals,
    workouts: state.workouts,
    calorieGoal: Number(calorieGoal.value) || 0,
    burnGoal: Number(burnGoal.value) || 0,
    palette: paletteSelect.value,
    theme: document.body.dataset.theme || "light",
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
    if (snapshot.palette) {
      paletteSelect.value = snapshot.palette;
    }
    if (snapshot.theme) {
      document.body.dataset.theme = snapshot.theme;
    } else {
      document.body.dataset.theme = "light";
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
        <span>${meal.calories} cal - P ${meal.protein}g - C ${meal.carbs}g - F ${meal.fat}g</span>
      </div>
      <span>${meal.time}</span>
    `;
    mealList.appendChild(row);
  });
};

const renderWorkouts = () => {
  exerciseList.innerHTML = "";
  state.workouts.slice().reverse().forEach((workout) => {
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `
      <div>
        <strong>${workout.name}</strong>
        <span>${workout.minutes} min - ${workout.calories} cal burned</span>
      </div>
      <span>${workout.time}</span>
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

mealForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const meal = {
    name: document.querySelector("#mealName").value.trim(),
    calories: Number(document.querySelector("#mealCalories").value),
    protein: Number(document.querySelector("#mealProtein").value),
    carbs: Number(document.querySelector("#mealCarbs").value),
    fat: Number(document.querySelector("#mealFat").value),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  if (!meal.name) {
    return;
  }

  state.meals.push(meal);
  mealForm.reset();
  mealServing.value = "1";
  lastLookupNutrients = null;
  renderMeals();
  updateTotals();
});

exerciseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const workout = {
    name: document.querySelector("#exerciseName").value.trim(),
    minutes: Number(document.querySelector("#exerciseMinutes").value),
    calories: Number(document.querySelector("#exerciseCalories").value),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  if (!workout.name) {
    return;
  }

  state.workouts.push(workout);
  exerciseForm.reset();
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
  });
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
modeToggle.textContent = document.body.dataset.theme === "dark" ? "Light Mode" : "Dark Mode";
updateTheme();
renderMeals();
renderWorkouts();
updateTotals();
