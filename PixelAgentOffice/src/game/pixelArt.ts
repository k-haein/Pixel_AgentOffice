import Phaser from 'phaser'

/**
 * Render a pixel-art sprite from a string grid.
 * Each character = 1 art pixel. '.' (or any char not in palette) = transparent.
 *
 * @returns A Container positioned at (centerX, centerY). The sprite is centered in the container.
 */
export function drawPixelGrid(
  scene: Phaser.Scene,
  pixels: string[],
  palette: Record<string, number>,
  centerX: number,
  centerY: number,
  pixelSize: number = 2,
): Phaser.GameObjects.Container {
  const container = scene.add.container(centerX, centerY)
  const cols = Math.max(...pixels.map(r => r.length))
  const rows = pixels.length

  for (let r = 0; r < rows; r++) {
    const line = pixels[r]
    for (let c = 0; c < line.length; c++) {
      const ch = line[c]
      const color = palette[ch]
      if (color === undefined) continue
      const px = (c - cols / 2 + 0.5) * pixelSize
      const py = (r - rows / 2 + 0.5) * pixelSize
      const rect = scene.add.rectangle(px, py, pixelSize, pixelSize, color)
      container.add(rect)
    }
  }

  return container
}
