
import { pipeline, env } from
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const $ = (id) => document.getElementById(id);

const form = $("productForm");
const generateBtn = $("generateBtn");
const statusEl = $("status");
const emptyState = $("emptyState");
const results = $("results");

let generator = null;
let lastData = null;
let lastOutput = null;

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 2500);
}

function getData() {
  return {
    name: $("productName").value.trim(),
    category: $("category").value,
    audience: $("audience").value,
    features: $("features").value.trim(),
    price: $("price").value.trim(),
    tone: $("tone").value,
    platform: $("platform").value
  };
}

function fallbackListing(data) {
  const title = `${data.name} | ${data.category}`;

  const description =
    `${data.name} is designed for ${data.audience.toLowerCase()}. ` +
    `${data.features} ` +
    `${data.price ? "Price: " + data.price + ". " : ""}` +
    `Explore this product and see how it fits your everyday needs.`;

  const words = data.name.toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const tags = [
    ...new Set([
      ...words.slice(0, 3).map(word => "#" + word),
      "#smallbusiness",
      "#productfinds",
      "#shoplocal",
      "#giftidea"
    ])
  ].slice(0, 8);

  const caption =
    `${data.name} ✨ ${data.features} ` +
    `${data.price ? "Price: " + data.price + ". " : ""}` +
    `Message us to know more!`;

  return { title, description, tags, caption };
}

async function getModel() {
  if (!generator) {
    statusEl.textContent = "LOADING AI";

    toast("Loading the open-weight AI model...");

    generator = await pipeline(
      "text2text-generation",
      "Xenova/flan-t5-small"
    );
  }

  return generator;
}

async function generateWithAI(data) {
  const model = await getModel();

  const prompt =
    `Write a concise ecommerce product description in ${data.tone} style. ` +
    `Product: ${data.name}. ` +
    `Category: ${data.category}. ` +
    `Target customer: ${data.audience}. ` +
    `Features: ${data.features}. ` +
    `Price: ${data.price || "not provided"}. ` +
    `Use only supplied facts. Do not invent specifications.`;

  const output = await model(prompt, {
    max_new_tokens: 120
  });

  const description =
    String(output?.[0]?.generated_text || "").trim();

  if (description.length < 10) {
    throw new Error("The model returned an incomplete description.");
  }

  return {
    ...fallbackListing(data),
    description
  };
}

function showResults(output) {
  lastOutput = output;

  $("outTitle").textContent = output.title;
  $("outDescription").textContent = output.description;
  $("outCaption").textContent = output.caption;

  $("outTags").replaceChildren(
    ...output.tags.map(tag => {
      const element = document.createElement("span");
      element.className = "tag";
      element.textContent = tag;
      return element;
    })
  );

  emptyState.classList.add("hidden");
  results.classList.remove("hidden");
}

async function createListing() {
  const data = getData();

  if (!data.name || !data.features) {
    toast("Please enter the product name and key features.");
    return;
  }

  lastData = data;

  generateBtn.disabled = true;
  generateBtn.textContent = "Creating your sales kit...";
  statusEl.textContent = "PREPARING";

  try {
    const output = await generateWithAI(data);

    showResults(output);
    statusEl.textContent = "OPEN AI · READY";

    toast("Your listing is ready!");
  } catch (error) {
    console.warn("AI unavailable; using local template.", error);

    showResults(fallbackListing(data));

    statusEl.textContent = "LOCAL TEMPLATE MODE";

    toast("AI could not load. A local template was used.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "✦ Generate My Listing ↗";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createListing();
});

$("regenerateBtn").addEventListener("click", async () => {
  if (!lastData) return;

  if (generator) {
    await createListing();
  } else {
    const newTone =
      lastData.tone === "Playful & trendy"
        ? "Friendly & persuasive"
        : "Playful & trendy";

    showResults(
      fallbackListing({ ...lastData, tone: newTone })
    );

    toast("Another version created.");
  }
});

document.querySelectorAll("[data-copy]").forEach(button => {
  button.addEventListener("click", async () => {
    if (!lastOutput) return;

    const key = button.dataset.copy;

    const value = key === "tags"
      ? lastOutput.tags.join(" ")
      : lastOutput[key];

    try {
      await navigator.clipboard.writeText(value);
      toast("Copied to clipboard!");
    } catch {
      toast("Copy failed. Please select and copy the text.");
    }
  });
});
