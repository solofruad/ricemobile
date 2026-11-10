import { useEffect, useState } from "react";
import { Image as RNImage } from "react-native";
import { Skia } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";

const fieldTextureSource = require("../../../assets/textures/field.webp");

let texturePromise: Promise<SkImage | null> | null = null;

export function loadFieldTexture(): Promise<SkImage | null> {
  if (!texturePromise) {
    texturePromise = (async () => {
      const uri = RNImage.resolveAssetSource(fieldTextureSource).uri;
      const data = await Skia.Data.fromURI(uri);
      return Skia.Image.MakeImageFromEncoded(data);
    })();
  }
  return texturePromise;
}

export function useFieldTexture(): SkImage | null {
  const [texture, setTexture] = useState<SkImage | null>(null);

  useEffect(() => {
    let mounted = true;
    loadFieldTexture()
      .then(image => {
        if (mounted) setTexture(image);
      })
      .catch(() => {
        if (mounted) setTexture(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return texture;
}