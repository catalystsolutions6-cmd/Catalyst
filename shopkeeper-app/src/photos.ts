import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/** Long edge in px. Enough for the AI to read model stickers, small enough to upload fast on mobile data. */
const MAX_EDGE = 1600;

export type PhotoSource = "camera" | "gallery";

export class PermissionDeniedError extends Error {}

/** Opens the camera or gallery and returns compressed local JPEG URIs (empty if cancelled). */
export async function pickPhotos(source: PhotoSource, max = 6): Promise<string[]> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new PermissionDeniedError("Camera permission is needed to photograph products.");
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 1,
    allowsMultipleSelection: source === "gallery",
    selectionLimit: max,
  };
  const result =
    source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, max).map((a) => compress(a.uri, a.width, a.height)));
}

async function compress(uri: string, width: number, height: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE) {
    ctx.resize(width >= height ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE });
  }
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
  return out.uri;
}
