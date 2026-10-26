import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processImage, sniffImage } from "@/server/services/media";

describe("image handling", () => {
  it("identifies images by content, not by name", async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).png().toBuffer();
    const jpeg = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).jpeg().toBuffer();
    const webp = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).webp().toBuffer();
    expect(sniffImage(png)).toBe("png");
    expect(sniffImage(jpeg)).toBe("jpeg");
    expect(sniffImage(webp)).toBe("webp");
    expect(sniffImage(Buffer.from("<svg onload=alert(1)></svg>................"))).toBeNull();
    expect(sniffImage(Buffer.from("MZ executable........"))).toBeNull();
  });

  it("re-encodes as WebP, strips EXIF (including GPS) and bounds the size", async () => {
    const withExif = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#3366cc" } })
      .jpeg()
      .withExif({ IFD0: { Copyright: "secret-owner", Make: "PhoneCo" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "26/1 20/1 0/1" } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const out = await processImage(withExif);
    const full = await sharp(out.data).metadata();
    const thumb = await sharp(out.thumb).metadata();
    expect(full.format).toBe("webp");
    expect(Math.max(full.width!, full.height!)).toBeLessThanOrEqual(1600);
    expect(thumb.width).toBeLessThanOrEqual(480);
    expect(full.exif).toBeUndefined();
    expect(out.data.includes(Buffer.from("secret-owner"))).toBe(false);
  });

  it("refuses corrupt data", async () => {
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
    await expect(processImage(broken)).rejects.toThrow();
  });
});
