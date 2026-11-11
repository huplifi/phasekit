/** Decode and re-encode user photos; never retain arbitrary uploaded data URLs. */
export async function prepareMeasurementPhoto(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 12 * 1024 * 1024
  ) {
    throw new Error("unsupported-photo");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 50_000_000
    )
      throw new Error("oversize-photo");
    const scale = Math.min(
      1,
      1200 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("photo-unavailable");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.6, 0.4]) {
      const photo = canvas.toDataURL("image/jpeg", quality);
      if (
        photo.startsWith("data:image/jpeg;base64,") &&
        photo.length <= 300_000
      )
        return photo;
    }
    throw new Error("oversize-photo");
  } finally {
    URL.revokeObjectURL(url);
  }
}
