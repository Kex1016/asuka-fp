export const ephemeralAttachmentRegex =
  /https:\/\/media\.discordapp\.net\/ephemeral-attachments\/\d+\/\d+\/.+\.(.+)\?.+/;

export const genres = [
  "ACTION",
  "ADVENTURE",
  "COMEDY",
  "DRAMA",
  "ECCHI",
  "FANTASY",
  "HORROR",
  "MAHOU_SHOUJO",
  "MECHA",
  "MUSIC",
  "MYSTERY",
  "PSYCHOLOGICAL",
  "ROMANCE",
  "SCI-FI",
  "SLICE_OF_LIFE",
  "SPORTS",
  "SUPERNATURAL",
  "THRILLER",
];

export const tempDir = process.env.TEMP_DIR || "/tmp";
