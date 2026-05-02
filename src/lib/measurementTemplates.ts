export type MeasurementField = { key: string; label: string };

export const CATEGORIES = [
  "Shirt",
  "Trouser",
  "Dress",
  "Agbada",
  "Kaftan",
  "Skirt",
  "Suit",
  "Gown",
  "Buba & Iro",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const make = (labels: string[]): MeasurementField[] =>
  labels.map((l) => ({ key: slug(l), label: l }));

export const TEMPLATES: Record<Category, MeasurementField[]> = {
  Shirt: make(["Chest", "Shoulder", "Sleeve Length", "Neck", "Body Length"]),
  Trouser: make(["Waist", "Length", "Thigh", "Knee", "Bottom"]),
  Dress: make(["Bust", "Waist", "Hip", "Length", "Shoulder"]),
  Agbada: make(["Length", "Sleeve", "Chest", "Shoulder", "Neck"]),
  Kaftan: make(["Length", "Chest", "Shoulder", "Sleeve", "Neck"]),
  Skirt: make(["Waist", "Hip", "Length"]),
  Suit: make(["Chest", "Shoulder", "Sleeve", "Jacket Length", "Waist", "Trouser Length"]),
  Gown: make(["Bust", "Underbust", "Waist", "Hip", "Full Length", "Sleeve"]),
  "Buba & Iro": make(["Bust", "Shoulder", "Sleeve", "Buba Length", "Iro Length"]),
  Other: make(["Measurement 1", "Measurement 2"]),
};

export const newField = (label = "New field"): MeasurementField => ({
  key: slug(label) + "_" + Math.random().toString(36).slice(2, 6),
  label,
});
